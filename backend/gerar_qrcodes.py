import os, sys
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RESTAURANTE_EMAIL = "makotomatias3@gmail.com"
FRONTEND_URL      = os.getenv("FRONTEND_URL", "https://qrcode-restaurante.vercel.app")


def conectar():
    db_url = os.getenv("DATABASE_URL", "")
    parsed = urlparse(db_url)
    user     = parsed.username or ""
    password = unquote(parsed.password or "")
    host     = parsed.hostname or ""
    port     = parsed.port or 5432
    database = (parsed.path or "").lstrip("/")

    try:
        import psycopg2
        conn = psycopg2.connect(
            host=host, port=port, user=user,
            password=password, dbname=database,
            sslmode="require", connect_timeout=10,
        )
        conn.autocommit = False
        return conn
    except ModuleNotFoundError:
        pass

    import pg8000.dbapi, ssl
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode    = ssl.CERT_NONE
    conn = pg8000.dbapi.connect(
        user=user, password=password,
        host=host, port=port, database=database,
        ssl_context=ctx, timeout=10,
    )
    conn.autocommit = False
    return conn


def main():
    from app.services.qrcode_service import gerar_qrcode_base64

    conn = conectar()
    cur  = conn.cursor()

    cur.execute("SELECT id FROM restaurantes WHERE email = %s LIMIT 1", (RESTAURANTE_EMAIL,))
    row = cur.fetchone()
    if not row:
        print(f"Restaurante '{RESTAURANTE_EMAIL}' nao encontrado.")
        sys.exit(1)

    rid = str(row[0])

    cur.execute(
        "SELECT id, numero FROM mesas WHERE restaurante_id = %s ORDER BY numero",
        (rid,)
    )
    mesas = cur.fetchall()
    print(f"{len(mesas)} mesas encontradas.")

    atualizadas = 0
    for mesa_id, numero in mesas:
        url = f"{FRONTEND_URL}/?mesa={numero}&restaurante={rid}"
        qr  = gerar_qrcode_base64(url)
        cur.execute(
            "UPDATE mesas SET qr_code = %s WHERE id = %s",
            (qr, str(mesa_id))
        )
        atualizadas += 1
        print(f"   Mesa {numero}: QR code gerado")

    conn.commit()
    cur.close()
    conn.close()
    print(f"\n{atualizadas} mesas atualizadas.")


if __name__ == "__main__":
    main()
