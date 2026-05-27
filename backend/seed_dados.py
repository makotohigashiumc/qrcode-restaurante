"""
seed_dados.py

Execucao:
  cd backend
  .\\venv\\Scripts\\Activate.ps1   (Windows)
  source venv/bin/activate        (Linux/Mac)
  python seed_dados.py

Volumes gerados:
  mesas          ->  20 registros
  categorias     ->   5 registros
  itens_cardapio ->  50 registros
  pedidos        -> 1200 registros (distribuidos em 90 dias)
  itens_pedido   -> ~3600 registros (media 3 por pedido)
"""

import os, sys, random, uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RESTAURANTE_EMAIL = "makotomatias3@gmail.com"
FRONTEND_URL      = "https://qrcode-restaurante.vercel.app"
TOTAL_PEDIDOS     = 1200
DIAS_HISTORICO    = 90

NOMES = [
    "Ana Silva", "Bruno Costa", "Carla Souza", "Daniel Lima", "Eduarda Rocha",
    "Felipe Martins", "Gabriela Ferreira", "Henrique Alves", "Isabela Nunes",
    "Joao Pereira", "Karina Melo", "Lucas Barbosa", "Mariana Cardoso",
    "Nicolas Rodrigues", "Olivia Santos", "Pedro Oliveira", "Rafael Gomes",
    "Sofia Mendes", "Thiago Castro", "Vinicius Ramos", "Yasmin Teixeira",
    "Alice Pinto", "Bernardo Correia", "Clara Monteiro", "Diego Nascimento",
    "Elena Batista", "Giovanna Dias", "Hugo Carvalho", "Ingrid Cunha",
    "Julio Azevedo", "Kelly Moreira", "Leonardo Vieira", "Melissa Campos",
    "Natan Ribeiro", "Patricia Duarte", "Ricardo Andrade", "Sabrina Moraes",
    "Tiago Nogueira", "Valentina Cruz", "Wesley Borges",
]

CARDAPIO = {
    "Entradas": [
        ("Edamame",            "Vagem de soja cozida com sal grosso",                        12.90),
        ("Guioza (6 un.)",     "Pastel japones grelhado recheado com carne e cebolinha",      28.90),
        ("Sunomono",           "Salada de pepino com molho ponzu e gergelim",                 18.90),
        ("Agedashi Tofu",      "Tofu frito em caldo dashi com cebolinha",                     22.90),
        ("Harumaki (4 un.)",   "Rolinho primavera crocante com recheio de legumes",           24.90),
        ("Ceviche Nikkei",     "Peixe branco marinado com limao, shoyu e pimenta",            38.00),
        ("Camarao Tempura",    "Camaroes empanados em massa leve com molho tentsuyu",         42.00),
        ("Yasai Salada",       "Mix de folhas com molho misso e gergelim torrado",            21.90),
    ],
    "Pratos Principais": [
        ("Salmao Teriyaki",    "File de salmao grelhado com molho teriyaki e arroz gohan",   68.90),
        ("Frango Karaage",     "Frango frito crocante estilo japones com maionese kewpie",    52.90),
        ("Tonkatsu",           "Lombo de porco empanado com molho tonkatsu e coleslaw",       54.90),
        ("Gyudon",             "Bowl de arroz com carne bovina fatiada e cebola caramelizada",56.90),
        ("Yakisoba de Frango", "Macarrao soba salteado com frango e legumes",                 48.90),
        ("Katsudon",           "Bowl de arroz com tonkatsu, ovo e cebola",                    58.90),
        ("Hamburguer Wagyu",   "Hamburguer de wagyu com queijo, teriyaki e batata frita",    78.90),
        ("Tempura Misto",      "Mix de camarao e legumes empanados com caldo tentsuyu",       62.90),
        ("Udon Nabeyaki",      "Caldo quente com macarrao udon, camarao e ovo",               59.90),
        ("Tofu Dengaku",       "Tofu grelhado com pasta de misso adocicada e arroz",          46.90),
        ("Salmao Misoyaki",    "Salmao marinado em pasta de misso, grelhado com arroz",       72.00),
        ("Oyakodon",           "Bowl de arroz com frango, ovo e cebola em caldo dashi",       49.90),
    ],
    "Sushis e Sashimis": [
        ("Combinado 20 pecas",         "Selecao do chef: niguiris, uramakis e hossomakis",   89.90),
        ("Sashimi de Salmao (10 un.)", "Fatias frescas de salmao noruegues",                 58.90),
        ("Niguiri Misto (8 un.)",      "4 de salmao e 4 de atum sobre arroz temperado",      52.90),
        ("Uramaki Filadelfia (8 un.)", "Salmao, cream cheese e pepino cobertos com gergelim",38.90),
        ("Hossomaki Salmao (8 un.)",   "Enrolado fino com salmao",                           28.90),
        ("Temaki de Salmao",           "Cone de alga com salmao, cream cheese e pepino",      24.90),
        ("Sashimi de Atum (8 un.)",    "Fatias de atum fresco com wasabi e gengibre",         54.90),
        ("Uramaki Camarao (8 un.)",    "Camarao, manga e cream cheese, coberto com gergelim", 42.90),
        ("Niguiri Camarao (4 un.)",    "Camarao sobre base de arroz com wasabi",              32.90),
        ("Combinado Familia 40 pecas", "Variedade ampla para grupos",                        165.00),
    ],
    "Sobremesas": [
        ("Mochi de Morango",     "Bolinho de arroz glutinoso recheado com morango e creme",  18.90),
        ("Mochi de Matcha",      "Bolinho de arroz com recheio de creme de cha verde",        18.90),
        ("Dorayaki",             "Panqueca japonesa recheada com pasta de feijao azuki",      16.90),
        ("Pudim de Matcha",      "Pudim cremoso de cha verde com calda de caramelo",          22.90),
        ("Sorvete Mochi (3 un.)","Sorvete envolvido em massa de mochi, sabores variados",     24.90),
        ("Taiyaki",              "Biscoito em forma de peixe recheado com creme ou azuki",   14.90),
    ],
    "Bebidas": [
        ("Agua Mineral",          "500ml com ou sem gas",                                      6.00),
        ("Refrigerante Lata",     "350ml - Coca-Cola, Guarana ou Sprite",                      7.50),
        ("Suco Natural",          "300ml - laranja, limao ou maracuja",                       12.90),
        ("Cerveja Long Neck",     "330ml - Sapporo, Kirin ou Asahi",                          16.90),
        ("Sake Quente",           "200ml - sake junmai aquecido",                             28.90),
        ("Sake Gelado",           "200ml - sake nigori gelado",                               26.90),
        ("Cha Verde Gelado",      "400ml - cha sencha gelado com limao",                      11.90),
        ("Ramune",                "250ml - refrigerante japones sabor melao",                 14.90),
        ("Limonada com Yuzu",     "Limonada artesanal com toque de yuzu",                     18.90),
        ("Cerveja Japonesa 600ml","Sapporo ou Kirin - garrafa",                               32.90),
    ],
}

STATUS_DIST = [
    ("entregue",   60),
    ("cancelado",  10),
    ("em_preparo", 12),
    ("pronto",      8),
    ("recebido",   10),
]

OBSERVACOES = [
    "", "", "", "", "", "",
    "Sem wasabi", "Molho extra", "Sem gengibre", "Bem passado",
    "Sem gluten", "Sem lactose", "Pimenta a parte", "Extra molho teriyaki",
    "Arroz sem tempero", "Para viagem", "Porcao extra", "Sem cebolinha",
]

TURNOS = [
    (11, 14, 40),
    (14, 17,  5),
    (17, 23, 55),
]


def rand_status():
    pool = [s for s, w in STATUS_DIST for _ in range(w)]
    return random.choice(pool)


def rand_data():
    dias = random.randint(0, DIAS_HISTORICO)
    total_peso = sum(w for _, _, w in TURNOS)
    r = random.randint(1, total_peso)
    acumulado = 0
    hora_inicio, hora_fim = 11, 23
    for h_ini, h_fim, peso in TURNOS:
        acumulado += peso
        if r <= acumulado:
            hora_inicio, hora_fim = h_ini, h_fim
            break
    hora   = random.randint(hora_inicio, hora_fim - 1)
    minuto = random.randint(0, 59)
    return datetime.now(timezone.utc) - timedelta(days=dias, hours=23 - hora, minutes=59 - minuto)


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
        import psycopg2.extras
        conn = psycopg2.connect(
            host=host, port=port, user=user,
            password=password, dbname=database,
            sslmode="require",
            connect_timeout=10,
        )
        conn.autocommit = False
        return conn, "psycopg2"
    except ModuleNotFoundError:
        pass

    import pg8000.dbapi
    import ssl
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode    = ssl.CERT_NONE
    conn = pg8000.dbapi.connect(
        user=user, password=password,
        host=host, port=port, database=database,
        ssl_context=ctx, timeout=10,
    )
    return conn, "pg8000"


def main():
    print("=" * 55)
    print("  seed_dados.py")
    print("=" * 55)

    conn, driver = conectar()
    print(f"\nConectado via {driver}")
    cur = conn.cursor()

    cur.execute("SELECT id, nome FROM restaurantes WHERE email = %s LIMIT 1", (RESTAURANTE_EMAIL,))
    row = cur.fetchone()
    if not row:
        print(f"\nErro: restaurante '{RESTAURANTE_EMAIL}' nao encontrado.")
        sys.exit(1)

    rid  = str(row[0])
    nome = row[1]
    print(f"Restaurante: {nome} ({rid[:8]}...)")

    # Mesas
    print("\n[1/4] Mesas...")
    cur.execute("SELECT numero FROM mesas WHERE restaurante_id = %s", (rid,))
    existentes = {r[0] for r in cur.fetchall()}
    mesas_inserir = [
        (str(uuid.uuid4()), rid, n, f"{FRONTEND_URL}/?mesa={n}&restaurante={rid}")
        for n in range(1, 21) if n not in existentes
    ]
    if mesas_inserir:
        cur.executemany(
            "INSERT INTO mesas (id, restaurante_id, numero, qr_code) VALUES (%s,%s,%s,%s)",
            mesas_inserir
        )

    # Atualiza qr_code das mesas que ja existem mas nao tem qr_code
    cur.execute(
        "SELECT id, numero FROM mesas WHERE restaurante_id = %s AND (qr_code IS NULL OR qr_code = '')",
        (rid,)
    )
    sem_qr = cur.fetchall()
    for mesa_id, numero in sem_qr:
        cur.execute(
            "UPDATE mesas SET qr_code = %s WHERE id = %s",
            (f"{FRONTEND_URL}/?mesa={numero}&restaurante={rid}", str(mesa_id))
        )

    conn.commit()
    cur.execute("SELECT id FROM mesas WHERE restaurante_id = %s ORDER BY numero", (rid,))
    mesas_ids = [str(r[0]) for r in cur.fetchall()]
    print(f"   {len(mesas_ids)} mesas")

    # Categorias e itens
    print("\n[2/4] Categorias e itens...")
    itens_pool = []

    for ordem, (cat_nome, pratos) in enumerate(CARDAPIO.items(), 1):
        cur.execute(
            "SELECT id FROM categorias WHERE restaurante_id=%s AND LOWER(TRIM(nome))=LOWER(%s) LIMIT 1",
            (rid, cat_nome)
        )
        cat_row = cur.fetchone()
        if not cat_row:
            cat_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO categorias (id, restaurante_id, nome, ordem) VALUES (%s,%s,%s,%s)",
                (cat_id, rid, cat_nome, ordem)
            )
        else:
            cat_id = str(cat_row[0])

        for nome_item, desc, preco in pratos:
            cur.execute(
                "SELECT id FROM itens_cardapio WHERE restaurante_id=%s AND LOWER(TRIM(nome))=LOWER(%s) LIMIT 1",
                (rid, nome_item)
            )
            item_row = cur.fetchone()
            if not item_row:
                item_id = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO itens_cardapio
                       (id, restaurante_id, categoria_id, nome, descricao, preco, disponivel)
                       VALUES (%s,%s,%s,%s,%s,%s,TRUE)""",
                    (item_id, rid, cat_id, nome_item, desc, preco)
                )
            else:
                item_id = str(item_row[0])
            itens_pool.append((item_id, float(preco)))

    conn.commit()
    print(f"   {len(itens_pool)} itens")

    # Pedidos em lote
    print(f"\n[3/4] Pedidos (meta: {TOTAL_PEDIDOS})...")
    cur.execute("SELECT COUNT(*) FROM pedidos WHERE restaurante_id = %s", (rid,))
    ja_existem = cur.fetchone()[0]
    faltam = max(0, TOTAL_PEDIDOS - ja_existem)
    print(f"   Existentes: {ja_existem} | Criando: {faltam}")

    pedidos_rows  = []
    itens_rows    = []
    pedidos_criados = itens_criados = 0
    LOTE = 100

    for i in range(faltam):
        mesa_id      = random.choice(mesas_ids)
        nome_cli     = random.choice(NOMES)
        qtd_itens    = random.randint(1, 6)
        selecionados = random.sample(itens_pool, min(qtd_itens, len(itens_pool)))
        status       = rand_status()
        criado_em    = rand_data()
        subtotal     = sum(preco * random.randint(1, 3) for _, preco in selecionados)
        total        = round(subtotal * 1.10, 2)
        pid          = str(uuid.uuid4())

        pedidos_rows.append((pid, mesa_id, rid, nome_cli, total, status, criado_em))
        pedidos_criados += 1

        for item_id, preco in selecionados:
            qtd = random.randint(1, 3)
            itens_rows.append((str(uuid.uuid4()), pid, item_id, qtd, preco, random.choice(OBSERVACOES)))
            itens_criados += 1

        if len(pedidos_rows) >= LOTE:
            cur.executemany(
                """INSERT INTO pedidos
                   (id, mesa_id, restaurante_id, nome_cliente, total, status, criado_em)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                pedidos_rows
            )
            cur.executemany(
                """INSERT INTO itens_pedido
                   (id, pedido_id, item_cardapio_id, quantidade, preco_unitario, observacao)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                itens_rows
            )
            conn.commit()
            pedidos_rows = []
            itens_rows   = []
            print(f"   {pedidos_criados}/{faltam}...")

    if pedidos_rows:
        cur.executemany(
            """INSERT INTO pedidos
               (id, mesa_id, restaurante_id, nome_cliente, total, status, criado_em)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            pedidos_rows
        )
        cur.executemany(
            """INSERT INTO itens_pedido
               (id, pedido_id, item_cardapio_id, quantidade, preco_unitario, observacao)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            itens_rows
        )
        conn.commit()

    print(f"   Pedidos criados:       {pedidos_criados}")
    print(f"   Itens criados:         {itens_criados}")

    # Resumo
    print("\n[4/4] Resumo:")
    tabelas = ["restaurantes", "mesas", "categorias", "itens_cardapio", "pedidos", "itens_pedido"]
    for t in tabelas:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        n = cur.fetchone()[0]
        print(f"   {t:<22} {n:>6} registros")

    cur.close()
    conn.close()
    print("\nConcluido.")


if __name__ == "__main__":
    main()
