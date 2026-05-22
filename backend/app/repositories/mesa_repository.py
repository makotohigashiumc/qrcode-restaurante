from app.database import execute_query, execute_write


def listar_por_restaurante(restaurante_id: str):
    return execute_query(
        "SELECT * FROM mesas WHERE restaurante_id = %s ORDER BY numero",
        (restaurante_id,)
    )


def buscar_por_numero(restaurante_id: str, numero: int):
    return execute_query(
        "SELECT * FROM mesas WHERE restaurante_id = %s AND numero = %s AND ativa = true",
        (restaurante_id, numero), fetchone=True
    )


def buscar_por_id(mesa_id: str):
    return execute_query(
        "SELECT * FROM mesas WHERE id = %s",
        (mesa_id,), fetchone=True
    )


def criar(restaurante_id, numero):
    return execute_write(
        "INSERT INTO mesas (restaurante_id, numero) VALUES (%s,%s) "
        "RETURNING *",
        (restaurante_id, numero), returning=True
    )


def atualizar_qrcode(mesa_id: str, qr_code: str):
    execute_write(
        "UPDATE mesas SET qr_code = %s WHERE id = %s",
        (qr_code, mesa_id)
    )


def deletar(mesa_id: str, restaurante_id: str):
    execute_write(
        "DELETE FROM mesas WHERE id = %s AND restaurante_id = %s",
        (mesa_id, restaurante_id)
    )
