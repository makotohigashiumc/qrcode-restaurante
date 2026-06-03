"""
Testes unitários — Módulo: mesas_controller.py
Cobre a verificação do token do QR Code.
"""
import pytest
from unittest.mock import patch
from datetime import datetime, timezone


def mesa_fake(token_qr="token-valido-uuid"):
    return {
        "id": "mesa-uuid-001",
        "restaurante_id": "restaurante-teste-uuid",
        "numero": 1,
        "ativa": True,
        "token_qr": token_qr,
        "ultima_liberacao": None,
        "qr_code": "data:image/svg+xml;base64,abc123",
    }


# ─── GET /api/mesas/verificar ─────────────────────────────────────────────────

class TestVerificarMesa:

    def test_parametros_ausentes_retorna_400(self, client):
        """Requisição sem parâmetros deve retornar 400."""
        resp = client.get("/api/mesas/verificar")
        assert resp.status_code == 400

    def test_mesa_nao_encontrada_retorna_404(self, client):
        """Mesa inexistente deve retornar 404."""
        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=None):
            resp = client.get(
                "/api/mesas/verificar?restaurante=uuid&numero=99&token=qualquer"
            )
        assert resp.status_code == 404

    def test_token_invalido_retorna_403(self, client):
        """Token do QR Code inválido deve retornar 403."""
        with patch("app.repositories.mesa_repository.buscar_por_numero",
                   return_value=mesa_fake(token_qr="token-correto")):
            resp = client.get(
                "/api/mesas/verificar?restaurante=uuid&numero=1&token=token-errado"
            )
        assert resp.status_code == 403

    def test_token_valido_retorna_200(self, client):
        """Token correto deve retornar 200 com os dados da mesa."""
        with patch("app.repositories.mesa_repository.buscar_por_numero",
                   return_value=mesa_fake(token_qr="token-valido-uuid")):
            resp = client.get(
                "/api/mesas/verificar?restaurante=restaurante-teste-uuid&numero=1&token=token-valido-uuid"
            )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["numero"] == 1
