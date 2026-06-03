"""
Testes unitários — Módulo: auth_service.py
Cobre hash de senha, geração e decodificação de JWT,
e o decorator requer_auth.
"""
import pytest
import time
from unittest.mock import patch
from app.services.auth_service import (
    hash_senha, verificar_senha, gerar_token, decodificar_token
)


# ─── hash e verificação de senha ─────────────────────────────────────────────

class TestHashSenha:

    def test_hash_diferente_do_original(self):
        """O hash não deve ser igual à senha em texto simples."""
        h = hash_senha("Senha@123")
        assert h != "Senha@123"

    def test_verificar_senha_correta(self):
        """verificar_senha deve retornar True para senha correta."""
        h = hash_senha("Senha@123")
        assert verificar_senha("Senha@123", h) is True

    def test_verificar_senha_incorreta(self):
        """verificar_senha deve retornar False para senha errada."""
        h = hash_senha("Senha@123")
        assert verificar_senha("SenhaErrada@1", h) is False

    def test_dois_hashes_diferentes(self):
        """Duas chamadas com a mesma senha devem gerar hashes diferentes (salt)."""
        h1 = hash_senha("Senha@123")
        h2 = hash_senha("Senha@123")
        assert h1 != h2

    def test_verificar_senha_string_vazia(self):
        """String vazia não deve ser validada contra um hash real."""
        h = hash_senha("Senha@123")
        assert verificar_senha("", h) is False


# ─── JWT ─────────────────────────────────────────────────────────────────────

class TestJWT:

    def test_gerar_e_decodificar_token(self):
        """Token gerado deve ser decodificável com os campos corretos."""
        token = gerar_token("uuid-restaurante-123", "dono@restaurante.com")
        payload = decodificar_token(token)
        assert payload["sub"] == "uuid-restaurante-123"
        assert payload["email"] == "dono@restaurante.com"

    def test_token_invalido_lanca_excecao(self):
        """Token adulterado deve lançar exceção na decodificação."""
        import jwt
        with pytest.raises(jwt.InvalidTokenError):
            decodificar_token("token.invalido.qualquer")

    def test_token_expirado_lanca_excecao(self):
        """Token com expiração no passado deve lançar ExpiredSignatureError."""
        import jwt
        from datetime import datetime, timezone, timedelta
        from app.services.auth_service import JWT_SECRET, JWT_ALGO

        payload = {
            "sub": "uuid-123",
            "email": "x@x.com",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=9),
        }
        token_expirado = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
        with pytest.raises(jwt.ExpiredSignatureError):
            decodificar_token(token_expirado)


# ─── decorator requer_auth ────────────────────────────────────────────────────

class TestRequerAuth:

    def test_sem_token_retorna_401(self, client):
        """Rota protegida sem Authorization header deve retornar 401."""
        resp = client.get("/api/pedidos")
        assert resp.status_code == 401

    def test_token_invalido_retorna_401(self, client):
        """Token malformado deve retornar 401."""
        resp = client.get(
            "/api/pedidos",
            headers={"Authorization": "Bearer token.invalido"}
        )
        assert resp.status_code == 401

    def test_token_valido_passa_auth(self, client, auth_headers):
        """Token válido deve passar pelo decorator (status não é 401)."""
        with patch("app.repositories.pedido_repository.listar_por_restaurante", return_value=[]), \
             patch("app.database.execute_query", return_value=[]):
            resp = client.get("/api/pedidos", headers=auth_headers)
        assert resp.status_code != 401

    def test_formato_bearer_obrigatorio(self, client, auth_token):
        """Token sem prefixo 'Bearer ' deve ser rejeitado."""
        resp = client.get(
            "/api/pedidos",
            headers={"Authorization": auth_token}  # sem "Bearer "
        )
        assert resp.status_code == 401
