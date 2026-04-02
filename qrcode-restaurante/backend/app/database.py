import os
from urllib.parse import urlparse, unquote, parse_qs
import ssl
import socket
from dotenv import load_dotenv
from flask import g, has_request_context

load_dotenv()

_DATABASE_URL = os.getenv("DATABASE_URL")
_PG8000_PORT_OVERRIDE = None


class DatabaseUnavailable(Exception):
    pass


def _require_db_url():
    if not _DATABASE_URL:
        raise RuntimeError("DATABASE_URL não configurada no .env")


def _rows_to_dicts(cursor, rows):
    cols = [c[0] for c in (cursor.description or [])]
    return [dict(zip(cols, r)) for r in rows]


def _connect_pg8000(url: str, port_override: int | None = None):
    import pg8000.dbapi  # type: ignore

    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        raise RuntimeError("DATABASE_URL deve começar com postgresql://")

    user = parsed.username or ""
    password = unquote(parsed.password or "")
    host = parsed.hostname or ""
    port = port_override or parsed.port or 5432
    database = (parsed.path or "").lstrip("/")

    qs = parse_qs(parsed.query or "")
    sslmode = (qs.get("sslmode", [""])[0] or "").lower()

    # Timeout (segundos): evita travar o painel quando a rede/DB cai.
    # Aceita ?connect_timeout=10 ou ?timeout=10 na DATABASE_URL.
    timeout_raw = (qs.get("connect_timeout", [""])[0] or qs.get("timeout", [""])[0] or os.getenv("DB_TIMEOUT", "3"))
    try:
        timeout = int(timeout_raw)
    except Exception:
        timeout = 3
    # No libpq, sslmode=require criptografa mas não valida a CA.
    # Em algumas redes/Windows a validação pode falhar por cadeia interceptada.
    ssl_context = None
    if sslmode == "require":
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    conn = pg8000.dbapi.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database=database,
        ssl_context=ssl_context,
        timeout=timeout,
    )
    return conn


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


def get_connection():
    """Retorna uma conexão com o PostgreSQL.

    Em contexto de request do Flask, reutiliza uma conexão por request (armazenada em flask.g)
    para evitar overhead de abrir conexões repetidamente.
    """
    _require_db_url()

    if has_request_context():
        conn = getattr(g, "_db_conn", None)
        if conn is not None:
            return conn

    # Preferir psycopg2 quando disponível (prod), senão usar pg8000 (dev/py novo)
    try:
        try:
            conn = _connect_psycopg2(_DATABASE_URL)
        except ModuleNotFoundError:
            global _PG8000_PORT_OVERRIDE
            parsed = urlparse(_DATABASE_URL)
            primary_port = _PG8000_PORT_OVERRIDE or parsed.port or 5432

            conn = _connect_pg8000(_DATABASE_URL, port_override=primary_port)
            try:
                _pg8000_validate_connection(conn)
            except Exception as exc:
                # Alguns ambientes conseguem abrir TCP em 6543, mas a conexão fica travada.
                # Fallback para 5432 (session pooler) costuma resolver.
                if _is_transient_db_error(exc):
                    try:
                        conn.close()
                    except Exception:
                        pass

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
        if _is_transient_db_error(exc):
            raise DatabaseUnavailable("Banco indisponível") from exc
        raise

    if has_request_context():
        g._db_conn = conn
    return conn


def close_request_connection():
    """Fecha a conexão reaproveitada no final do request (teardown)."""
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
    """Força reconexão no próximo get_connection() dentro do mesmo request."""
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


def _is_transient_db_error(exc: Exception) -> bool:
    mod = getattr(exc.__class__, "__module__", "")
    name = getattr(exc.__class__, "__name__", "")
    if mod.startswith("pg8000") and name in ("InterfaceError", "OperationalError"):
        return True
    if mod.startswith("psycopg2") and name in ("OperationalError", "InterfaceError"):
        return True
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
    # Retry ajuda em resets de conexão; em timeout costuma só dobrar a espera.
    return _is_transient_db_error(exc) and not _is_timeout_like_error(exc)


def execute_query(sql: str, params=None, fetchone=False):
    """Executa uma query SELECT e retorna resultado(s)."""
    last_exc = None
    for attempt in (1, 2):
        conn = None
        cur = None
        try:
            conn = get_connection()
            cur = conn.cursor()

            if params is None:
                cur.execute(sql)
            else:
                cur.execute(sql, params)
            if fetchone:
                row = cur.fetchone()
                if row is None:
                    return None
                return row if isinstance(row, dict) else _rows_to_dicts(cur, [row])[0]

            rows = cur.fetchall()
            return rows if (rows and isinstance(rows[0], dict)) else _rows_to_dicts(cur, rows)
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


def execute_write(sql: str, params=None, returning=False):
    """Executa INSERT/UPDATE/DELETE. Se returning=True, retorna o registro."""
    last_exc = None
    for attempt in (1, 2):
        conn = None
        cur = None
        try:
            conn = get_connection()
            cur = conn.cursor()

            if params is None:
                cur.execute(sql)
            else:
                cur.execute(sql, params)

            # psycopg2 normalmente usa autocommit=False; pg8000 também
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
