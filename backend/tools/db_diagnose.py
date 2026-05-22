import os
import ssl
import traceback
from urllib.parse import urlparse, parse_qs, unquote

from dotenv import load_dotenv


def main() -> int:
    load_dotenv()
    url = os.getenv("DATABASE_URL", "")
    print("Have DATABASE_URL:", bool(url))
    if not url:
        return 2

    parsed = urlparse(url)
    qs = parse_qs(parsed.query or "")
    sslmode = (qs.get("sslmode", [""])[0] or "").lower()

    timeout_raw = (
        qs.get("connect_timeout", [""])[0]
        or qs.get("timeout", [""])[0]
        or os.getenv("DB_TIMEOUT", "3")
    )
    try:
        timeout = int(timeout_raw)
    except Exception:
        timeout = 3

    print("Host:", parsed.hostname)
    print("Port:", parsed.port)
    print("DB:", (parsed.path or "").lstrip("/"))
    print("sslmode:", sslmode)
    print("timeout:", timeout)

    ssl_context = None
    if sslmode == "require":
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    try:
        import pg8000.dbapi  # type: ignore

        conn = pg8000.dbapi.connect(
            user=parsed.username or "",
            password=unquote(parsed.password or ""),
            host=parsed.hostname or "",
            port=parsed.port or 5432,
            database=(parsed.path or "").lstrip("/"),
            ssl_context=ssl_context,
            timeout=timeout,
        )
        cur = conn.cursor()
        cur.execute("select 1")
        print("select 1 =>", cur.fetchone())
        cur.close()
        conn.close()
        print("OK")
        return 0
    except Exception as exc:
        print("EXC TYPE:", type(exc))
        print("EXC REPR:", repr(exc))
        print("EXC ARGS:", getattr(exc, "args", None))
        print("CAUSE:", repr(getattr(exc, "__cause__", None)))
        print("CONTEXT:", repr(getattr(exc, "__context__", None)))
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
