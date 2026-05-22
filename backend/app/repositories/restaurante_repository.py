from app.database import execute_query, execute_write


def buscar_por_email(email: str):
    return execute_query(
        "SELECT * FROM restaurantes WHERE email = %s",
        (email,), fetchone=True
    )


def buscar_por_id(rid: str):
    return execute_query(
        "SELECT id, nome, email, telefone, cep, cidade, estado, logradouro, bairro, criado_em "
        "FROM restaurantes WHERE id = %s",
        (rid,), fetchone=True
    )


def criar(nome, email, senha_hash, telefone, cep, cidade, estado, logradouro, bairro):
    return execute_write(
        """INSERT INTO restaurantes
           (nome, email, senha_hash, telefone, cep, cidade, estado, logradouro, bairro)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING id, nome, email, telefone, cep, cidade, estado, logradouro, bairro""",
        (nome, email, senha_hash, telefone, cep, cidade, estado, logradouro, bairro),
        returning=True
    )


def atualizar(rid, nome, telefone, cep, cidade, estado, logradouro, bairro):
    return execute_write(
        """UPDATE restaurantes
           SET nome=%s, telefone=%s, cep=%s, cidade=%s, estado=%s, logradouro=%s, bairro=%s
           WHERE id=%s
           RETURNING id, nome, email, telefone, cep, cidade, estado, logradouro, bairro""",
        (nome, telefone, cep, cidade, estado, logradouro, bairro, rid),
        returning=True
    )
