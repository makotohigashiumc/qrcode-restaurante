from app.database import execute_query, execute_write


def criar_pedido(mesa_id, restaurante_id, nome_cliente, total):
    return execute_write(
        """INSERT INTO pedidos (mesa_id, restaurante_id, nome_cliente, total)
           VALUES (%s,%s,%s,%s) RETURNING *""",
        (mesa_id, restaurante_id, nome_cliente, total),
        returning=True
    )


def criar_item_pedido(pedido_id, item_cardapio_id, quantidade, preco_unitario, observacao):
    return execute_write(
        """INSERT INTO itens_pedido (pedido_id, item_cardapio_id, quantidade, preco_unitario, observacao)
           VALUES (%s,%s,%s,%s,%s) RETURNING *""",
        (pedido_id, item_cardapio_id, quantidade, preco_unitario, observacao),
        returning=True
    )


def listar_por_restaurante(restaurante_id: str, status: str = None):
    cond = "AND p.status = %s" if status else ""
    params = (restaurante_id, status) if status else (restaurante_id,)
    return execute_query(
        f"""SELECT p.*, m.numero AS mesa_numero
            FROM pedidos p
            JOIN mesas m ON m.id = p.mesa_id
            WHERE p.restaurante_id = %s {cond}
            ORDER BY p.criado_em DESC""",
        params
    )


def buscar_por_id(pedido_id: str):
    return execute_query(
        """SELECT p.*, m.numero AS mesa_numero
           FROM pedidos p
           JOIN mesas m ON m.id = p.mesa_id
           WHERE p.id = %s""",
        (pedido_id,), fetchone=True
    )


def buscar_itens_do_pedido(pedido_id: str):
    return execute_query(
        """SELECT ip.*, ic.nome AS item_nome, ic.imagem_url
           FROM itens_pedido ip
           JOIN itens_cardapio ic ON ic.id = ip.item_cardapio_id
           WHERE ip.pedido_id = %s""",
        (pedido_id,)
    )


def atualizar_status(pedido_id: str, restaurante_id: str, novo_status: str):
    return execute_write(
        """UPDATE pedidos SET status=%s
           WHERE id=%s AND restaurante_id=%s RETURNING *""",
        (novo_status, pedido_id, restaurante_id),
        returning=True
    )
