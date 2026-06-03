"""
Configuração compartilhada dos testes.
Cria o app Flask em modo de teste e mocka o banco de dados
para que os testes rodem sem precisar de conexão real.
"""
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture()
def app():
    """Cria uma instância do app Flask configurada para testes."""
    # Mocka o banco antes de importar o app, evitando conexão real
    with patch("app.database.execute_query", return_value=[]), \
         patch("app.database.execute_write", return_value=None):

        from app import create_app
        application = create_app()

    application.config.update({
        "TESTING": True,
        "MAIL_SUPPRESS_SEND": True,   # não envia e-mails nos testes
    })
    yield application


@pytest.fixture()
def client(app):
    """Cliente HTTP para fazer requisições nos testes."""
    return app.test_client()


@pytest.fixture()
def auth_token(app):
    """Gera um token JWT válido para usar nos testes de rotas protegidas."""
    from app.services.auth_service import gerar_token
    return gerar_token("restaurante-teste-uuid", "teste@email.com")


@pytest.fixture()
def auth_headers(auth_token):
    """Header Authorization pronto para usar nas requisições."""
    return {"Authorization": f"Bearer {auth_token}"}
