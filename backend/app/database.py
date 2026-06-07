import os
import ssl
import socket
from urllib.parse import urlparse, unquote, parse_qs
from dotenv import load_dotenv
from flask import g, has_request_context

load_dotenv()

_DATABASE_URL = os.getenv("DATABASE_URL")

_PG8000_PORT_OVERRIDE = None

class DatabaseUnavailable(Exception):
    """Banco indisponível ou pool de conexões esgotado.

    Capturada pelo errorhandler em app/__init__.py → retorna HTTP 503.
    """

def _require_db_url():
    if not _DATABASE_URL:
        raise RuntimeError("DATABASE_URL não configurada no .env")

def _rows_to_dicts(cursor, rows):
    cols = [c[0] for c in (cursor.description or [])]
    return [dict(zip(cols, r)) for r in rows]

def _is_pool_exhausted(exc: Exception) -> bool:
    
    msg = str(exc).lower()
    return "emaxconn" in msg or "max clients reached" in msg or "pool_size" in msg

def _is_transient_db_error(exc: Exception) -> bool:
    
    if _is_pool_exhausted(exc):
        return True

    mod  = getattr(exc.__class__, "__module__", "")
    name = getattr(exc.__class__, "__name__", "")

    if mod.startswith("pg8000") and name in (
        "InterfaceError", "OperationalError", "DatabaseError"
    ):
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
    
    if _is_pool_exhausted(exc):
        return False
    return _is_transient_db_error(exc) and not _is_timeout_like_error(exc)

def _build_ssl_context(sslmode: str):
    
    if sslmode in ("require", "prefer", "allow"):
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode    = ssl.CERT_NONE
        return ctx
    return None

def _connect_pg8000(url: str, port_override: int | None = None):
    import pg8000.dbapi

    parsed   = urlparse(url)
    user     = parsed.username or ""
    password = unquote(parsed.password or "")
    host     = parsed.hostname or ""
    port     = port_override or parsed.port or 5432
    database = (parsed.path or "").lstrip("/")

    qs      = parse_qs(parsed.query or "")
    sslmode = (qs.get("sslmode", [""])[0] or "").lower()

    timeout_raw = (
        qs.get("connect_timeout", [""])[0]
        or qs.get("timeout", [""])[0]
        or os.getenv("DB_TIMEOUT", "5")
    )
    try:
        timeout = int(timeout_raw)
    except Exception:
        timeout = 5

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
    import psycopg2
    from psycopg2.extras import RealDictCursor

    return psycopg2.connect(url, cursor_factory=RealDictCursor)

def get_connection():
    
    _require_db_url()

    if has_request_context():
        conn = getattr(g, "_db_conn", None)
        if conn is not None:
            return conn

    global _PG8000_PORT_OVERRIDE
    conn = None

    try:
        try:
            conn = _connect_psycopg2(_DATABASE_URL)
        except ModuleNotFoundError:
            parsed       = urlparse(_DATABASE_URL)
            primary_port = _PG8000_PORT_OVERRIDE or parsed.port or 5432

            conn = _connect_pg8000(_DATABASE_URL, port_override=primary_port)

            try:
                _pg8000_validate_connection(conn)
            except Exception as exc:
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
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
        if _is_transient_db_error(exc) or _is_pool_exhausted(exc):
            raise DatabaseUnavailable("Banco indisponível") from exc
        raise

    if has_request_context():
        g._db_conn = conn

    return conn

def close_request_connection():
    
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

def execute_query(sql: str, params=None, fetchone: bool = False):
    
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
            if not has_request_context():
                try:
                    if conn is not None:
                        conn.close()
                except Exception:
                    pass

    raise last_exc

def execute_write(sql: str, params=None, returning: bool = False):
    
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

    raise last_exc
