from app.database import execute_query, execute_write


# ---------- Categorias ----------

def listar_categorias(restaurante_id: str):
    # Dedup por nome (case/whitespace-insensitive) para evitar categorias duplicadas
    # em ambientes dev (ex.: StrictMode do React pode disparar efeitos duas vezes).
    return execute_query(
        """
        SELECT *
        FROM (
          SELECT DISTINCT ON (LOWER(TRIM(nome))) *
          FROM categorias
          WHERE restaurante_id = %s
          ORDER BY LOWER(TRIM(nome)), ordem, id
        ) c
        ORDER BY ordem, nome
        """,
        (restaurante_id,)
    )


def buscar_categoria_por_nome(restaurante_id: str, nome: str):
    return execute_query(
        """
        SELECT *
        FROM categorias
        WHERE restaurante_id = %s
          AND LOWER(TRIM(nome)) = LOWER(TRIM(%s))
        ORDER BY ordem, id
        LIMIT 1
        """,
        (restaurante_id, nome),
        fetchone=True,
    )


def criar_categoria(restaurante_id, nome, ordem=0):
    return execute_write(
        "INSERT INTO categorias (restaurante_id, nome, ordem) VALUES (%s,%s,%s) RETURNING *",
        (restaurante_id, nome, ordem), returning=True
    )


def atualizar_categoria(cat_id, restaurante_id, nome, ordem):
    return execute_write(
        "UPDATE categorias SET nome=%s, ordem=%s WHERE id=%s AND restaurante_id=%s RETURNING *",
        (nome, ordem, cat_id, restaurante_id), returning=True
    )


def deletar_categoria(cat_id, restaurante_id):
    execute_write(
        "DELETE FROM categorias WHERE id=%s AND restaurante_id=%s",
        (cat_id, restaurante_id)
    )


# ---------- Itens ----------

def listar_itens(restaurante_id: str, apenas_disponiveis=False):
    cond = "AND ic.disponivel = true" if apenas_disponiveis else ""
    return execute_query(
        f"""SELECT ic.*, c.nome AS categoria_nome, c.ordem AS categoria_ordem
            FROM itens_cardapio ic
            LEFT JOIN categorias c ON c.id = ic.categoria_id
            WHERE ic.restaurante_id = %s {cond}
            ORDER BY c.ordem, c.nome, ic.nome""",
        (restaurante_id,)
    )


def buscar_item(item_id: str, restaurante_id: str):
    return execute_query(
        "SELECT * FROM itens_cardapio WHERE id=%s AND restaurante_id=%s",
        (item_id, restaurante_id), fetchone=True
    )


def criar_item(restaurante_id, categoria_id, nome, descricao, preco, imagem_url, disponivel):
    return execute_write(
        """INSERT INTO itens_cardapio
           (restaurante_id, categoria_id, nome, descricao, preco, imagem_url, disponivel)
           VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (restaurante_id, categoria_id, nome, descricao, preco, imagem_url, disponivel),
        returning=True
    )


def atualizar_item(item_id, restaurante_id, categoria_id, nome, descricao, preco, imagem_url, disponivel):
    return execute_write(
        """UPDATE itens_cardapio
           SET categoria_id=%s, nome=%s, descricao=%s, preco=%s, imagem_url=%s, disponivel=%s
           WHERE id=%s AND restaurante_id=%s RETURNING *""",
        (categoria_id, nome, descricao, preco, imagem_url, disponivel, item_id, restaurante_id),
        returning=True
    )


def deletar_item(item_id: str, restaurante_id: str):
    execute_write(
        "DELETE FROM itens_cardapio WHERE id=%s AND restaurante_id=%s",
        (item_id, restaurante_id)
    )
