import os
import ssl
import socket
from urllib.parse import urlparse, unquote, parse_qs
from dotenv import load_dotenv
from flask import g, has_request_context

load_dotenv()

_DATABASE_URL = os.getenv("DATABASE_URL")

# Guarda o override de porta descoberto em runtime (pg8000 fallback 6543→5432).
# Resetado para None a cada reinício do processo.
_PG8000_PORT_OVERRIDE = None


# ──────────────────────────────────────────────────────────────
# Exceção pública: banco fora do ar ou pool esgotado
# ──────────────────────────────────────────────────────────────

class DatabaseUnavailable(Exception):
    """Banco indisponível ou pool de conexões esgotado.

    Capturada pelo errorhandler em app/__init__.py → retorna HTTP 503.
    """


# ──────────────────────────────────────────────────────────────
# Utilitários internos
# ──────────────────────────────────────────────────────────────

def _require_db_url():
    if not _DATABASE_URL:
        raise RuntimeError("DATABASE_URL não configurada no .env")


def _rows_to_dicts(cursor, rows):
    cols = [c[0] for c in (cursor.description or [])]
    return [dict(zip(cols, r)) for r in rows]


# ──────────────────────────────────────────────────────────────
# Classificadores de erro
# ──────────────────────────────────────────────────────────────

def _is_pool_exhausted(exc: Exception) -> bool:
    """Detecta erros de pool cheio (EMAXCONNSESSION / EMAXCONN).

    Ocorre no Supabase Session Pooler quando as 15 vagas estão ocupadas.
    Tratado como DatabaseUnavailable → retorna 503 ao frontend com
    mensagem amigável, sem explodir em 500.
    """
    msg = str(exc).lower()
    return "emaxconn" in msg or "max clients reached" in msg or "pool_size" in msg


def _is_transient_db_error(exc: Exception) -> bool:
    """Retorna True para erros transitórios de rede/conexão/pool."""
    # Pool esgotado → sempre transitório
    if _is_pool_exhausted(exc):
        return True

    mod  = getattr(exc.__class__, "__module__", "")
    name = getattr(exc.__class__, "__name__", "")

    # pg8000 — inclui DatabaseError porque EMAXCONNSESSION vem como DatabaseError
    if mod.startswith("pg8000") and name in (
        "InterfaceError", "OperationalError", "DatabaseError"
    ):
        return True

    # psycopg2
    if mod.startswith("psycopg2") and name in ("OperationalError", "InterfaceError"):
        return True

    # Erros de rede genéricos do Python
    if isinstance(exc, (TimeoutError, ConnectionError, socket.gaierror, ssl.SSLError, OSError)):
        msg = str(exc).lower()
        if any(
            s in msg
            for s in (
                "network",
                "timed out",
                "timeout",
                "connection refused",
                "connection reset",
                "reset by peer",
                "server closed",
                "could not connect",
                "getaddrinfo",
            )
        ):
            return True

    return False


def _is_timeout_like_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(s in msg for s in ("timed out", "timeout", "tempo limite", "network error"))


def _should_retry(exc: Exception) -> bool:
    """Retry apenas para erros de conexão/reset — não para pool cheio nem timeout."""
    if _is_pool_exhausted(exc):
        return False  # Retry imediato só piora — espera o 503 chegar ao cliente
    return _is_transient_db_error(exc) and not _is_timeout_like_error(exc)


# ──────────────────────────────────────────────────────────────
# Drivers de conexão
# ──────────────────────────────────────────────────────────────

def _build_ssl_context(sslmode: str):
    """Monta SSLContext tolerante para Supabase (não valida CA — padrão libpq require)."""
    if sslmode in ("require", "prefer", "allow"):
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode    = ssl.CERT_NONE
        return ctx
    return None


def _connect_pg8000(url: str, port_override: int | None = None):
    import pg8000.dbapi  # type: ignore

    parsed   = urlparse(url)
    user     = parsed.username or ""
    password = unquote(parsed.password or "")
    host     = parsed.hostname or ""
    port     = port_override or parsed.port or 5432
    database = (parsed.path or "").lstrip("/")

    qs      = parse_qs(parsed.query or "")
    sslmode = (qs.get("sslmode", [""])[0] or "").lower()

    # Timeout de conexão: aceita ?connect_timeout=N na URL ou variável DB_TIMEOUT.
    # Padrão 5 s — generoso o suficiente para Supabase, curto o suficiente para
    # não travar o painel em caso de queda.
    timeout_raw = (
        qs.get("connect_timeout", [""])[0]
        or qs.get("timeout", [""])[0]
        or os.getenv("DB_TIMEOUT", "5")
    )
    try:
        timeout = int(timeout_raw)
    except Exception:
        timeout = 5

    # Supabase exige SSL mesmo sem sslmode na URL quando o host é *.supabase.co
    if not sslmode and host.endswith(".supabase.co"):
        sslmode = "require"

    ssl_context = _build_ssl_context(sslmode)

    return pg8000.dbapi.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database=database,
        ssl_context=ssl_context,
        timeout=timeout,
    )


def _pg8000_validate_connection(conn) -> None:
    cur = conn.cursor()
    try:
        cur.execute("select 1")
        cur.fetchone()
    finally:
        try:
            cur.close()
        except Exception:
            pass


def _connect_psycopg2(url: str):
    import psycopg2  # type: ignore
    from psycopg2.extras import RealDictCursor  # type: ignore

    return psycopg2.connect(url, cursor_factory=RealDictCursor)


# ──────────────────────────────────────────────────────────────
# Gestão de conexão por request
# ──────────────────────────────────────────────────────────────

def get_connection():
    """Retorna uma conexão PostgreSQL.

    Em contexto de request Flask, reutiliza a mesma conexão durante todo
    o request (armazenada em flask.g) para evitar abrir múltiplas conexões
    por chamada a execute_query/execute_write.

    A conexão é fechada ao final do request via close_request_connection()
    registrado em teardown_appcontext em app/__init__.py.
    """
    _require_db_url()

    # ── Reutilizar conexão aberta neste request ──────────────
    if has_request_context():
        conn = getattr(g, "_db_conn", None)
        if conn is not None:
            return conn

    # ── Abrir nova conexão ────────────────────────────────────
    global _PG8000_PORT_OVERRIDE
    conn = None

    try:
        # Preferir psycopg2 (prod / Python ≤ 3.12); cair em pg8000 no Python 3.13+
        try:
            conn = _connect_psycopg2(_DATABASE_URL)
        except ModuleNotFoundError:
            parsed       = urlparse(_DATABASE_URL)
            primary_port = _PG8000_PORT_OVERRIDE or parsed.port or 5432

            conn = _connect_pg8000(_DATABASE_URL, port_override=primary_port)

            try:
                _pg8000_validate_connection(conn)
            except Exception as exc:
                # Fallback: se 6543 (transaction pooler) falhar na validação,
                # tenta 5432 (session pooler) no mesmo host Supabase.
                # Nota: EMAXCONNSESSION não chega aqui — ocorre dentro do connect(),
                # não na validação. Este bloco cobre resets de TCP na abertura.
                if _is_transient_db_error(exc) and not _is_pool_exhausted(exc):
                    try:
                        conn.close()
                    except Exception:
                        pass
                    conn = None

                    alt_port = None
                    if primary_port == 6543 and (parsed.hostname or "").endswith(".pooler.supabase.com"):
                        alt_port = 5432

                    if alt_port is not None:
                        conn = _connect_pg8000(_DATABASE_URL, port_override=alt_port)
                        _pg8000_validate_connection(conn)
                        _PG8000_PORT_OVERRIDE = alt_port
                    else:
                        raise
                else:
                    raise

    except Exception as exc:
        # Fechar conexão parcialmente aberta antes de propagar
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
        if _is_transient_db_error(exc) or _is_pool_exhausted(exc):
            raise DatabaseUnavailable("Banco indisponível") from exc
        raise

    # ── Guardar no contexto do request ───────────────────────
    if has_request_context():
        g._db_conn = conn

    return conn


def close_request_connection():
    """Fecha a conexão ao final do request (chamada pelo teardown_appcontext)."""
    if not has_request_context():
        return
    conn = getattr(g, "_db_conn", None)
    if conn is None:
        return
    try:
        conn.close()
    except Exception:
        pass
    try:
        delattr(g, "_db_conn")
    except Exception:
        pass


def _reset_request_conn(conn=None):
    """Descarta a conexão corrente e força reabertura no próximo get_connection()."""
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass
    if has_request_context() and hasattr(g, "_db_conn"):
        try:
            delattr(g, "_db_conn")
        except Exception:
            pass


# ──────────────────────────────────────────────────────────────
# API pública: execute_query / execute_write
# ──────────────────────────────────────────────────────────────

def execute_query(sql: str, params=None, fetchone: bool = False):
    """Executa SELECT e retorna lista de dicts (ou dict único se fetchone=True)."""
    last_exc = None
    for attempt in (1, 2):
        conn = cur = None
        try:
            conn = get_connection()
            cur  = conn.cursor()

            cur.execute(sql) if params is None else cur.execute(sql, params)

            if fetchone:
                row = cur.fetchone()
                if row is None:
                    return None
                return row if isinstance(row, dict) else _rows_to_dicts(cur, [row])[0]

            rows = cur.fetchall()
            if not rows:
                return []
            return rows if isinstance(rows[0], dict) else _rows_to_dicts(cur, rows)

        except Exception as exc:
            last_exc = exc
            if attempt == 1 and _should_retry(exc):
                _reset_request_conn(conn)
                continue
            if _is_transient_db_error(exc):
                raise DatabaseUnavailable("Banco indisponível") from exc
            raise

        finally:
            try:
                if cur is not None:
                    cur.close()
            except Exception:
                pass
            # Fora de request: fechar imediatamente (scripts, seeds, testes)
            if not has_request_context():
                try:
                    if conn is not None:
                        conn.close()
                except Exception:
                    pass

    raise last_exc  # pragma: no cover


def execute_write(sql: str, params=None, returning: bool = False):
    """Executa INSERT / UPDATE / DELETE.

    Se returning=True, retorna o registro afetado (requer RETURNING na query).
    """
    last_exc = None
    for attempt in (1, 2):
        conn = cur = None
        try:
            conn = get_connection()
            cur  = conn.cursor()

            cur.execute(sql) if params is None else cur.execute(sql, params)

            try:
                conn.commit()
            except Exception:
                pass

            if returning:
                row = cur.fetchone()
                if row is None:
                    return None
                return row if isinstance(row, dict) else _rows_to_dicts(cur, [row])[0]

            return None

        except Exception as exc:
            last_exc = exc
            if attempt == 1 and _should_retry(exc):
                _reset_request_conn(conn)
                continue
            if _is_transient_db_error(exc):
                raise DatabaseUnavailable("Banco indisponível") from exc
            raise

        finally:
            try:
                if cur is not None:
                    cur.close()
            except Exception:
                pass
            if not has_request_context():
                try:
                    if conn is not None:
                        conn.close()
                except Exception:
                    pass

    raise last_exc  # pragma: no cover
