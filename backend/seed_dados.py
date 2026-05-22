"""
seed_dados.py — Popula o banco com volume de dados realista
Mínimo 1000 registros nas tabelas principais (pedidos e itens_pedido)

Execução:
  cd backend
  .\venv\Scripts\Activate.ps1   (Windows)
  python seed_dados.py

Tabelas e volumes gerados:
  mesas          →  30 registros
  categorias     →   4 registros (padrão)
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

# ── Configuração ─────────────────────────────────────────────
RESTAURANTE_EMAIL = "makotomatias3@gmail.com"   # ajuste se necessário
TOTAL_PEDIDOS     = 1200                         # quantidade de pedidos a criar
DIAS_HISTORICO    = 90                           # dias de histórico

# ── Dados mock ───────────────────────────────────────────────
NOMES = [
    "Ana Silva","Bruno Costa","Carla Souza","Daniel Lima","Eduarda Rocha",
    "Felipe Martins","Gabriela Ferreira","Henrique Alves","Isabela Nunes",
    "João Pereira","Karina Melo","Lucas Barbosa","Mariana Cardoso",
    "Nicolas Rodrigues","Olivia Santos","Pedro Oliveira","Quitéria Lopes",
    "Rafael Gomes","Sofia Mendes","Thiago Castro","Ursula Freitas",
    "Vinicius Ramos","Wanderley Araújo","Ximena Cavalcanti","Yasmin Teixeira",
    "Zeca Moura","Alice Pinto","Bernardo Correia","Clara Monteiro",
    "Diego Nascimento","Elena Batista","Fábio Rezende","Giovanna Dias",
    "Hugo Carvalho","Ingrid Cunha","Julio Azevedo","Kelly Moreira",
    "Leonardo Vieira","Melissa Campos","Natan Ribeiro","Odalys Fernandes",
    "Patricia Duarte","Quentin Farias","Ricardo Andrade","Sabrina Moraes",
    "Tiago Nogueira","Valentina Cruz","Wesley Borges","Xenia Torres","Yago Lima",
]

CARDAPIO = {
    "Entradas": [
        ("Bruschetta ao Alho",     "Pão gralhado com alho, tomate e manjericão",           18.90),
        ("Crostini de Cogumelos",  "Torradas com cogumelos salteados e parmesão",          22.50),
        ("Carpaccio de Atum",      "Finas fatias de atum com alcaparras e limão",           38.00),
        ("Bolinho de Bacalhau",    "6 unidades crocantes com ervas finas",                 32.50),
        ("Bruschetta Clássica",    "Pão gralhado com tomate e azeite",                     22.90),
        ("Camarão ao Alho",        "Camarões salteados com alho e pimenta",                45.00),
        ("Tábua de Frios",         "Embutidos, queijos e acompanhamentos",                 55.00),
        ("Ceviche de Tilápia",     "Tilápia marinada com cebola roxa e coentro",           34.90),
        ("Provolone Grelhado",     "Queijo provolone com azeite e orégano",                28.90),
        ("Pão de Queijo Artesanal","6 unidades com queijo mineiro",                        16.90),
        ("Carpaccio de Carne",     "Finas fatias com rúcula, parmesão e limão",            38.00),
        ("Rabada Crocante",        "Rabada desfiada frita com molho barbecue",             36.90),
    ],
    "Pratos Principais": [
        ("Filé ao Molho Madeira",  "Filé mignon com molho madeira, arroz e batata",        68.90),
        ("Frango à Parmegiana",    "Frango empanado com molho de tomate e mussarela",      52.90),
        ("Salmão Grelhado",        "Salmão com crosta de ervas e purê",                    76.50),
        ("Risoto de Camarão",      "Arroz arbóreo com camarões e limão",                   72.00),
        ("Massa ao Funghi",        "Tagliatelle com cogumelos porcini",                    58.00),
        ("Picanha na Chapa",       "400g com chimichurri, arroz e farofa",                 89.90),
        ("Bacalhau à Brás",        "Bacalhau desfiado com batata-palha e ovos",            78.00),
        ("Nhoque ao Sugo",         "Nhoque de batata com molho de tomate fresco",          46.90),
        ("Medalhão Suíno",         "Medalhão com redução de vinho e legumes",              62.90),
        ("Moqueca de Peixe",       "Peixe com dendê, leite de coco e pimentões",          71.00),
        ("Costela Assada",         "Costela bovina assada lentamente com mandioca",        87.90),
        ("Frango na Chapa",        "Peito grelhado com legumes e arroz integral",          48.90),
        ("Penne ao Pesto",         "Macarrão com molho pesto e tomate-cereja",             46.00),
    ],
    "Sobremesas": [
        ("Petit Gâteau",           "Bolo quente com sorvete de baunilha",                  28.90),
        ("Pudim de Leite",         "Pudim cremoso com calda de caramelo",                  18.90),
        ("Tiramisù",               "Sobremesa italiana com mascarpone e café",             26.00),
        ("Cheesecake de Frutas",   "Base de biscoito com cream cheese e frutas",           24.90),
        ("Mousse de Chocolate",    "Mousse aerado com ganache",                            21.90),
        ("Crème Brûlée",           "Creme francês com casquinha de açúcar",                23.90),
        ("Sorvete Artesanal",      "3 bolas à escolha com calda e chantilly",              19.90),
        ("Torta de Limão",         "Massa crocante com creme de limão e merengue",         22.90),
        ("Brownie com Sorvete",    "Brownie quente com sorvete e calda",                   27.90),
        ("Panna Cotta",            "Creme italiano com calda de frutas vermelhas",         20.90),
    ],
    "Bebidas": [
        ("Água Mineral",           "500ml com ou sem gás",                                  6.00),
        ("Refrigerante Lata",      "350ml - Coca-Cola, Guaraná ou Sprite",                  7.50),
        ("Suco Natural",           "300ml - laranja, limão, abacaxi ou manga",             12.90),
        ("Cerveja Long Neck",      "330ml - Heineken, Stella Artois ou Corona",            14.90),
        ("Caipirinha",             "Limão ou morango com cachaça ou vodka",                22.90),
        ("Vinho da Casa (Taça)",   "Tinto ou branco selecionado pelo sommelier",           24.00),
        ("Chopp Artesanal",        "400ml - Pilsen, IPA ou Weiss",                         18.90),
        ("Limonada Suíça",         "Limão siciliano, leite condensado e creme",            16.90),
        ("Chá Gelado",             "500ml - Pêssego ou Limão com hortelã",                  9.90),
        ("Café Expresso",          "Duplo ou simples",                                      8.90),
        ("Água de Coco",           "300ml natural gelado",                                  8.90),
        ("Suco de Acaí",           "300ml com guaraná e mel",                              14.90),
        ("Cerveja Artesanal",      "600ml - Pilsen, Weiss ou IPA",                         28.90),
    ],
}

STATUS_DIST = [
    ("entregue", 60), ("cancelado", 12), ("em_preparo", 12),
    ("pronto", 8),    ("recebido", 8),
]

OBS = ["","","","","","","Sem cebola","Sem glúten","Bem passado","Al dente",
       "Sem pimenta","Capricha no molho","Sem lactose","Ponto médio","Extra molho"]


def rand_status():
    pool = [s for s, w in STATUS_DIST for _ in range(w)]
    return random.choice(pool)


def rand_data():
    d = random.randint(0, DIAS_HISTORICO)
    h = random.randint(11, 22)
    m = random.randint(0, 59)
    return datetime.now(timezone.utc) - timedelta(days=d, hours=23-h, minutes=59-m)


def main():
    print("=" * 55)
    print("  seed_dados.py — qrcode-restaurante")
    print("=" * 55)

    # 1. Busca restaurante
    rest = execute_query(
        "SELECT id, nome FROM restaurantes WHERE email = %s LIMIT 1",
        (RESTAURANTE_EMAIL,), fetchone=True
    )
    if not rest:
        print(f"\nErro: restaurante '{RESTAURANTE_EMAIL}' nao encontrado.")
        print("Cadastre o restaurante primeiro e ajuste RESTAURANTE_EMAIL.")
        sys.exit(1)

    rid = str(rest["id"])
    print(f"\nRestaurante: {rest['nome']} ({rid[:8]}...)")

    # ── 2. Mesas ─────────────────────────────────────────────
    print("\n[1/4] Criando mesas...")
    existentes = {
        m["numero"]
        for m in execute_query(
            "SELECT numero FROM mesas WHERE restaurante_id = %s", (rid,)
        )
    }
    for n in range(1, 31):
        if n not in existentes:
            execute_write(
                "INSERT INTO mesas (restaurante_id, numero) VALUES (%s,%s)",
                (rid, n)
            )
    mesas = execute_query(
        "SELECT id, numero FROM mesas WHERE restaurante_id = %s ORDER BY numero",
        (rid,)
    )
    mesas_ids = [str(m["id"]) for m in mesas]
    print(f"   {len(mesas_ids)} mesas disponíveis")

    # ── 3. Categorias e itens ─────────────────────────────────
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

    # ── 4. Pedidos ────────────────────────────────────────────
    print(f"\n[3/4] Criando pedidos (meta: {TOTAL_PEDIDOS})...")

    ja_existem = execute_query(
        "SELECT COUNT(*) as n FROM pedidos WHERE restaurante_id = %s",
        (rid,), fetchone=True
    )["n"]
    faltam = max(0, TOTAL_PEDIDOS - ja_existem)
    print(f"   Já existem: {ja_existem} | Criando mais: {faltam}")

    pedidos_criados = 0
    itens_criados   = 0

    for i in range(faltam):
        mesa_id     = random.choice(mesas_ids)
        nome        = random.choice(NOMES)
        qtd_itens   = random.randint(1, 6)
        selecionados= random.sample(itens_pool, min(qtd_itens, len(itens_pool)))
        status      = rand_status()
        criado_em   = rand_data()

        # Calcula total
        subtotal = sum(preco * random.randint(1, 3) for _, preco in selecionados)
        total    = round(subtotal * 1.10, 2)

        pedido = execute_write(
            """INSERT INTO pedidos (mesa_id, restaurante_id, nome_cliente, total, status, criado_em)
               VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
            (mesa_id, rid, nome, total, status, criado_em),
            returning=True
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

    # ── 5. Resumo final ───────────────────────────────────────
    print("\n[4/4] Resumo do banco de dados:")
    tabelas = [
        "restaurantes", "mesas", "categorias",
        "itens_cardapio", "pedidos", "itens_pedido",
        "tokens_recuperacao",
    ]
    for t in tabelas:
        try:
            r = execute_query(f"SELECT COUNT(*) as n FROM {t}", fetchone=True)
            n = r["n"] if r else 0
            status_icon = "✓" if (t in ("pedidos","itens_pedido") and n >= 1000) or t not in ("pedidos","itens_pedido") else "!"
            print(f"   {status_icon} {t:<22} {n:>6} registros")
        except Exception:
            print(f"   ? {t:<22} (tabela não encontrada)")

    print("\nConcluido!")


if __name__ == "__main__":
    main()
