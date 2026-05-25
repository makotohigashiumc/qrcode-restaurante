"""
seed_dados.py — Popula o banco com volume de dados realista
Mínimo 1000 registros nas tabelas principais (pedidos e itens_pedido)

Execução:
  cd backend
  .\\venv\\Scripts\\Activate.ps1   (Windows)
  python seed_dados.py

Tabelas e volumes gerados:
  mesas          →  20 registros
  categorias     →   5 registros
  itens_cardapio →  50 registros
  pedidos        → 1200 registros  (distribuídos em 90 dias)
  itens_pedido   → ~3600 registros (média 3 por pedido)
"""

import os, sys, random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import execute_query, execute_write

RESTAURANTE_EMAIL = "makotomatias3@gmail.com"
TOTAL_PEDIDOS     = 1200
DIAS_HISTORICO    = 90

NOMES = [
    "Ana Silva", "Bruno Costa", "Carla Souza", "Daniel Lima", "Eduarda Rocha",
    "Felipe Martins", "Gabriela Ferreira", "Henrique Alves", "Isabela Nunes",
    "João Pereira", "Karina Melo", "Lucas Barbosa", "Mariana Cardoso",
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
        ("Guioza (6 un.)",     "Pastel japonês grelhado recheado com carne e cebolinha",      28.90),
        ("Sunomono",           "Salada de pepino com molho ponzu e gergelim",                 18.90),
        ("Agedashi Tofu",      "Tofu frito em caldo dashi com cebolinha",                     22.90),
        ("Harumaki (4 un.)",   "Rolinho primavera crocante com recheio de legumes",           24.90),
        ("Ceviche Nikkei",     "Peixe branco marinado com limão, shoyu e pimenta",            38.00),
        ("Camarão Tempurá",    "Camarões empanados em massa leve com molho tentsuyu",         42.00),
        ("Yasai Salada",       "Mix de folhas com molho missô e gergelim torrado",            21.90),
    ],
    "Pratos Principais": [
        ("Salmão Teriyaki",    "Filé de salmão grelhado com molho teriyaki e arroz gohan",   68.90),
        ("Frango Karaage",     "Frango frito crocante estilo japonês com maionese kewpie",    52.90),
        ("Tonkatsu",           "Lombo de porco empanado com molho tonkatsu e coleslaw",       54.90),
        ("Gyudon",             "Bowl de arroz com carne bovina fatiada e cebola caramelizada",56.90),
        ("Yakisoba de Frango", "Macarrão soba salteado com frango e legumes",                 48.90),
        ("Katsudon",           "Bowl de arroz com tonkatsu, ovo e cebola",                    58.90),
        ("Hambúrguer Wagyu",   "Hambúrguer de wagyu com queijo, teriyaki e batata frita",    78.90),
        ("Tempurá Misto",      "Mix de camarão e legumes empanados com caldo tentsuyu",       62.90),
        ("Udon Nabeyaki",      "Caldo quente com macarrão udon, camarão e ovo",               59.90),
        ("Tofu Dengaku",       "Tofu grelhado com pasta de missô adocicada e arroz",          46.90),
        ("Salmão Misoyaki",    "Salmão marinado em pasta de missô, grelhado com arroz",       72.00),
        ("Oyakodon",           "Bowl de arroz com frango, ovo e cebola em caldo dashi",       49.90),
    ],
    "Sushis e Sashimis": [
        ("Combinado Makoto 20 peças",  "Seleção do chef: niguiris, uramakis e hossomakis",   89.90),
        ("Sashimi de Salmão (10 un.)", "Fatias frescas de salmão norueguês",                  58.90),
        ("Niguiri Misto (8 un.)",      "4 de salmão e 4 de atum sobre arroz temperado",       52.90),
        ("Uramaki Filadélfia (8 un.)", "Salmão, cream cheese e pepino cobertos com gergelim", 38.90),
        ("Hossomaki Salmão (8 un.)",   "Enrolado fino com salmão",                            28.90),
        ("Temaki de Salmão",           "Cone de alga com salmão, cream cheese e pepino",       24.90),
        ("Sashimi de Atum (8 un.)",    "Fatias de atum fresco com wasabi e gengibre",          54.90),
        ("Uramaki Camarão (8 un.)",    "Camarão, manga e cream cheese, coberto com gergelim", 42.90),
        ("Niguiri Camarão (4 un.)",    "Camarão sobre base de arroz com wasabi",               32.90),
        ("Combinado Família 40 peças", "Variedade ampla para grupos",                         165.00),
    ],
    "Sobremesas": [
        ("Mochi de Morango",    "Bolinho de arroz glutinoso recheado com morango e creme",    18.90),
        ("Mochi de Matcha",     "Bolinho de arroz com recheio de creme de chá verde",         18.90),
        ("Dorayaki",            "Panqueca japonesa recheada com pasta de feijão azuki",       16.90),
        ("Pudim de Matcha",     "Pudim cremoso de chá verde com calda de caramelo",           22.90),
        ("Sorvete Mochi (3 un.)","Sorvete envolvido em massa de mochi, sabores variados",     24.90),
        ("Taiyaki",             "Biscoito em forma de peixe recheado com creme ou azuki",     14.90),
    ],
    "Bebidas": [
        ("Água Mineral",          "500ml com ou sem gás",                                     6.00),
        ("Refrigerante Lata",     "350ml — Coca-Cola, Guaraná ou Sprite",                     7.50),
        ("Suco Natural",          "300ml — laranja, limão ou maracujá",                      12.90),
        ("Cerveja Long Neck",     "330ml — Sapporo, Kirin ou Asahi",                         16.90),
        ("Saquê Quente",          "200ml — saquê junmai aquecido",                            28.90),
        ("Saquê Gelado",          "200ml — saquê nigori gelado",                              26.90),
        ("Chá Verde Gelado",      "400ml — chá sencha gelado com limão",                     11.90),
        ("Ramune",                "250ml — refrigerante japonês sabor melão",                 14.90),
        ("Limonada com Yuzu",     "Limonada artesanal com toque de yuzu",                    18.90),
        ("Cerveja Japonesa 600ml","Sapporo ou Kirin — garrafa",                              32.90),
    ],
}

STATUS_DIST = [
    ("entregue", 60), ("cancelado", 10), ("em_preparo", 12),
    ("pronto", 8),    ("recebido", 10),
]

OBS = [
    "", "", "", "", "", "",
    "Sem wasabi", "Molho extra", "Sem gengibre", "Bem passado",
    "Sem glúten", "Sem lactose", "Pimenta à parte", "Extra molho teriyaki",
    "Arroz sem tempero",
]


def rand_status():
    pool = [s for s, w in STATUS_DIST for _ in range(w)]
    return random.choice(pool)


def rand_data():
    d = random.randint(0, DIAS_HISTORICO)
    h = random.randint(11, 22)
    m = random.randint(0, 59)
    return datetime.now(timezone.utc) - timedelta(days=d, hours=23 - h, minutes=59 - m)


def main():
    print("=" * 55)
    print("  seed_dados.py — Makoto Restaurante Japonês")
    print("=" * 55)

    rest = execute_query(
        "SELECT id, nome FROM restaurantes WHERE email = %s LIMIT 1",
        (RESTAURANTE_EMAIL,), fetchone=True
    )
    if not rest:
        print(f"\nErro: restaurante '{RESTAURANTE_EMAIL}' não encontrado.")
        print("Cadastre o restaurante e ajuste RESTAURANTE_EMAIL.")
        import sys; sys.exit(1)

    rid = str(rest["id"])
    print(f"\nRestaurante: {rest['nome']} ({rid[:8]}...)")

    print("\n[1/4] Criando mesas...")
    existentes = {
        m["numero"]
        for m in execute_query("SELECT numero FROM mesas WHERE restaurante_id = %s", (rid,))
    }
    for n in range(1, 21):
        if n not in existentes:
            execute_write("INSERT INTO mesas (restaurante_id, numero) VALUES (%s,%s)", (rid, n))
    mesas = execute_query(
        "SELECT id, numero FROM mesas WHERE restaurante_id = %s ORDER BY numero", (rid,)
    )
    mesas_ids = [str(m["id"]) for m in mesas]
    print(f"   {len(mesas_ids)} mesas disponíveis")

    print("\n[2/4] Criando categorias e itens do cardápio...")
    itens_pool = []

    for ordem, (cat_nome, pratos) in enumerate(CARDAPIO.items(), 1):
        cat = execute_query(
            "SELECT id FROM categorias WHERE restaurante_id=%s AND LOWER(TRIM(nome))=LOWER(%s) LIMIT 1",
            (rid, cat_nome), fetchone=True
        )
        if not cat:
            cat = execute_write(
                "INSERT INTO categorias (restaurante_id, nome, ordem) VALUES (%s,%s,%s) RETURNING id",
                (rid, cat_nome, ordem), returning=True
            )
        cat_id = str(cat["id"])

        for nome_item, desc, preco in pratos:
            existe = execute_query(
                "SELECT id, preco FROM itens_cardapio WHERE restaurante_id=%s AND LOWER(TRIM(nome))=LOWER(%s) LIMIT 1",
                (rid, nome_item), fetchone=True
            )
            if not existe:
                novo = execute_write(
                    """INSERT INTO itens_cardapio
                       (restaurante_id, categoria_id, nome, descricao, preco, disponivel)
                       VALUES (%s,%s,%s,%s,%s,TRUE) RETURNING id, preco""",
                    (rid, cat_id, nome_item, desc, preco), returning=True
                )
                if novo:
                    itens_pool.append((str(novo["id"]), float(novo["preco"])))
            else:
                itens_pool.append((str(existe["id"]), float(existe["preco"])))

    print(f"   {len(itens_pool)} itens disponíveis no cardápio")

    print(f"\n[3/4] Criando pedidos (meta: {TOTAL_PEDIDOS})...")
    ja_existem = execute_query(
        "SELECT COUNT(*) as n FROM pedidos WHERE restaurante_id = %s", (rid,), fetchone=True
    )["n"]
    faltam = max(0, TOTAL_PEDIDOS - ja_existem)
    print(f"   Já existem: {ja_existem} | Criando mais: {faltam}")

    pedidos_criados = itens_criados = 0

    for i in range(faltam):
        mesa_id      = random.choice(mesas_ids)
        nome         = random.choice(NOMES)
        qtd_itens    = random.randint(1, 6)
        selecionados = random.sample(itens_pool, min(qtd_itens, len(itens_pool)))
        status       = rand_status()
        criado_em    = rand_data()

        subtotal = sum(preco * random.randint(1, 3) for _, preco in selecionados)
        total    = round(subtotal * 1.10, 2)

        pedido = execute_write(
            """INSERT INTO pedidos (mesa_id, restaurante_id, nome_cliente, total, status, criado_em)
               VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
            (mesa_id, rid, nome, total, status, criado_em), returning=True
        )
        if not pedido:
            continue

        pid = str(pedido["id"])
        pedidos_criados += 1

        for item_id, preco in selecionados:
            qtd = random.randint(1, 3)
            execute_write(
                """INSERT INTO itens_pedido
                   (pedido_id, item_cardapio_id, quantidade, preco_unitario, observacao)
                   VALUES (%s,%s,%s,%s,%s)""",
                (pid, item_id, qtd, preco, random.choice(OBS))
            )
            itens_criados += 1

        if (i + 1) % 200 == 0:
            print(f"   {i + 1}/{faltam} pedidos criados...")

    print(f"   Pedidos criados: {pedidos_criados}")
    print(f"   Itens de pedido criados: {itens_criados}")

    print("\n[4/4] Resumo do banco de dados:")
    tabelas = ["restaurantes", "mesas", "categorias", "itens_cardapio", "pedidos", "itens_pedido"]
    for t in tabelas:
        try:
            r = execute_query(f"SELECT COUNT(*) as n FROM {t}", fetchone=True)
            n = r["n"] if r else 0
            ok = "✓" if (t in ("pedidos", "itens_pedido") and n >= 1000) or t not in ("pedidos", "itens_pedido") else "!"
            print(f"   {ok} {t:<22} {n:>6} registros")
        except Exception:
            print(f"   ? {t:<22} (não encontrada)")

    print("\nConcluído!")


if __name__ == "__main__":
    main()
