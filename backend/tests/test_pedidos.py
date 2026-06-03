"""
Testes unitários — Módulo: pedidos_controller.py
Cobre criação de pedido, atualização de status e pedidos ativos por mesa.
O banco de dados é substituído por mocks para isolar o comportamento.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone


# ─── helpers ─────────────────────────────────────────────────────────────────

def mesa_fake(numero=1, ultima_liberacao=None):
    return {
        "id": "mesa-uuid-001",
        "restaurante_id": "restaurante-teste-uuid",
        "numero": numero,
        "ativa": True,
        "ultima_liberacao": ultima_liberacao,
        "token_qr": "token-fake-uuid",
    }

def item_fake(item_id="item-uuid-001", preco=25.90):
    return {
        "id": item_id,
        "nome": "X-Burguer",
        "preco": preco,
        "disponivel": True,
        "deletado_em": None,
        "restaurante_id": "restaurante-teste-uuid",
    }

def pedido_fake():
    return {
        "id": "pedido-uuid-001",
        "mesa_id": "mesa-uuid-001",
        "restaurante_id": "restaurante-teste-uuid",
        "nome_cliente": "João",
        "status": "recebido",
        "total": 25.90,
        "criado_em": datetime.now(timezone.utc),
    }

PAYLOAD_VALIDO = {
    "restaurante_id": "restaurante-teste-uuid",
    "mesa_numero": 1,
    "nome_cliente": "João",
    "itens": [{"item_id": "item-uuid-001", "quantidade": 1}],
}


# ─── POST /api/pedidos ────────────────────────────────────────────────────────

class TestCriarPedido:

    def test_dados_incompletos_retorna_400(self, client):
        """Requisição sem itens deve retornar 400."""
        resp = client.post(
            "/api/pedidos",
            json={"restaurante_id": "uuid", "mesa_numero": 1},
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "erro" in resp.get_json()

    def test_mesa_invalida_retorna_400(self, client):
        """Mesa inexistente deve retornar 400."""
        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=None):
            resp = client.post("/api/pedidos", json=PAYLOAD_VALIDO)
        assert resp.status_code == 400

    def test_item_indisponivel_retorna_400(self, client):
        """Item marcado como indisponível deve retornar 400."""
        item_indisponivel = item_fake()
        item_indisponivel["disponivel"] = False

        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=mesa_fake()), \
             patch("app.controllers.pedidos_controller.execute_query", return_value={"total": 0}), \
             patch("app.repositories.cardapio_repository.buscar_item", return_value=item_indisponivel):
            resp = client.post("/api/pedidos", json=PAYLOAD_VALIDO)
        assert resp.status_code == 400

    def test_pedido_criado_com_sucesso_retorna_201(self, client):
        """Pedido válido deve retornar 201 com os dados do pedido."""
        itens_retorno = [{"item_nome": "X-Burguer", "quantidade": 1, "preco_unitario": 25.90}]

        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=mesa_fake()), \
             patch("app.controllers.pedidos_controller.execute_query", return_value={"total": 0}), \
             patch("app.repositories.cardapio_repository.buscar_item", return_value=item_fake()), \
             patch("app.repositories.pedido_repository.criar_pedido", return_value=pedido_fake()), \
             patch("app.repositories.pedido_repository.criar_item_pedido", return_value=None), \
             patch("app.repositories.pedido_repository.buscar_itens_do_pedido", return_value=itens_retorno):
            resp = client.post("/api/pedidos", json=PAYLOAD_VALIDO)

        assert resp.status_code == 201
        data = resp.get_json()
        assert data["status"] == "recebido"
        assert data["total"] == 25.90

    def test_rate_limit_por_mesa_retorna_429(self, client):
        """Mesa com 5+ pedidos no último minuto deve retornar 429."""
        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=mesa_fake()), \
             patch("app.controllers.pedidos_controller.execute_query", return_value={"total": 5}):
            resp = client.post("/api/pedidos", json=PAYLOAD_VALIDO)
        assert resp.status_code == 429

    def test_body_vazio_retorna_400(self, client):
        """Requisição sem body deve retornar 400."""
        resp = client.post("/api/pedidos", json={})
        assert resp.status_code == 400


# ─── PATCH /api/pedidos/<id>/status ──────────────────────────────────────────

class TestAtualizarStatus:

    def test_status_invalido_retorna_400(self, client, auth_headers):
        """Status fora do enum deve retornar 400."""
        resp = client.patch(
            "/api/pedidos/pedido-uuid-001/status",
            json={"status": "voando"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_pedido_nao_encontrado_retorna_404(self, client, auth_headers):
        """Pedido inexistente deve retornar 404."""
        with patch("app.repositories.pedido_repository.atualizar_status", return_value=None):
            resp = client.patch(
                "/api/pedidos/pedido-uuid-001/status",
                json={"status": "em_preparo"},
                headers=auth_headers,
            )
        assert resp.status_code == 404

    def test_status_atualizado_com_sucesso(self, client, auth_headers):
        """Status válido deve retornar 200 com o novo status."""
        pedido_atualizado = {"id": "pedido-uuid-001", "status": "em_preparo"}
        with patch("app.repositories.pedido_repository.atualizar_status", return_value=pedido_atualizado):
            resp = client.patch(
                "/api/pedidos/pedido-uuid-001/status",
                json={"status": "em_preparo"},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "em_preparo"

    def test_todos_os_status_validos(self, client, auth_headers):
        """Todos os status do enum devem ser aceitos."""
        for status in ["recebido", "em_preparo", "pronto", "entregue", "cancelado"]:
            pedido_atualizado = {"id": "pedido-uuid-001", "status": status}
            with patch("app.repositories.pedido_repository.atualizar_status", return_value=pedido_atualizado):
                resp = client.patch(
                    "/api/pedidos/pedido-uuid-001/status",
                    json={"status": status},
                    headers=auth_headers,
                )
            assert resp.status_code == 200, f"Status '{status}' deveria ser aceito"

    def test_sem_autenticacao_retorna_401(self, client):
        """Rota protegida sem token deve retornar 401."""
        resp = client.patch(
            "/api/pedidos/pedido-uuid-001/status",
            json={"status": "pronto"},
        )
        assert resp.status_code == 401


# ─── GET /api/pedidos/mesa/<n>/ativos ────────────────────────────────────────

class TestPedidosAtivosMesa:

    def test_sem_restaurante_retorna_400(self, client):
        """Parâmetro restaurante ausente deve retornar 400."""
        resp = client.get("/api/pedidos/mesa/1/ativos")
        assert resp.status_code == 400

    def test_mesa_nao_encontrada_retorna_404(self, client):
        """Mesa inexistente deve retornar 404."""
        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=None):
            resp = client.get("/api/pedidos/mesa/1/ativos?restaurante=uuid-qualquer")
        assert resp.status_code == 404

    def test_retorna_pedidos_da_sessao_atual(self, client):
        """Deve retornar apenas pedidos criados após a última liberação."""
        agora = datetime.now(timezone.utc)
        pedido = {**pedido_fake(), "mesa_numero": 1, "atualizado_em": agora}
        itens = [{"item_nome": "X-Burguer", "quantidade": 1, "preco_unitario": 25.90}]

        with patch("app.repositories.mesa_repository.buscar_por_numero", return_value=mesa_fake(numero=1)), \
             patch("app.repositories.pedido_repository.listar_por_restaurante", return_value=[pedido]), \
             patch("app.repositories.pedido_repository.buscar_itens_do_pedido", return_value=itens):
            resp = client.get("/api/pedidos/mesa/1/ativos?restaurante=restaurante-teste-uuid")

        assert resp.status_code == 200
        data = resp.get_json()
        assert "pedidos" in data
