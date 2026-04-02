from flask import Blueprint, request, jsonify
from flask_socketio import emit
from decimal import Decimal, ROUND_HALF_UP
from app.services.auth_service import requer_auth
from app.repositories import pedido_repository as repo, mesa_repository as mesa_repo, cardapio_repository as cardapio_repo

pedidos_bp = Blueprint("pedidos", __name__, url_prefix="/api/pedidos")

_socketio = None


def init_socketio(sio):
    global _socketio
    _socketio = sio


# ─── PÚBLICO: criar pedido ───────────────────────────────────

@pedidos_bp.post("")
def criar_pedido():
    """POST /api/pedidos — cliente envia pedido da mesa."""
    data = request.get_json(silent=True) or {}

    restaurante_id = data.get("restaurante_id")
    numero_mesa = data.get("mesa_numero")
    nome_cliente = data.get("nome_cliente", "").strip()
    itens = data.get("itens", [])

    if not restaurante_id or not numero_mesa or not itens:
        return jsonify({"erro": "Dados incompletos"}), 400

    mesa = mesa_repo.buscar_por_numero(restaurante_id, int(numero_mesa))
    if not mesa:
        return jsonify({"erro": "Mesa inválida"}), 400

    subtotal = Decimal('0.00')
    itens_validados = []
    for it in itens:
        item = cardapio_repo.buscar_item(it["item_id"], restaurante_id)
        if not item or not item["disponivel"]:
            return jsonify({"erro": f"Item {it['item_id']} inválido"}), 400
        qtd = max(1, int(it.get("quantidade", 1)))
        preco_dec = Decimal(str(item["preco"]))
        subtotal += (preco_dec * Decimal(qtd))
        itens_validados.append({
            "item_cardapio_id": str(item["id"]),
            "quantidade": qtd,
            "preco_unitario": float(preco_dec),
            "observacao": it.get("observacao", ""),
        })

    taxa_servico = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total = (subtotal + taxa_servico).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    pedido = repo.criar_pedido(str(mesa["id"]), restaurante_id, nome_cliente, float(total))
    for iv in itens_validados:
        repo.criar_item_pedido(
            str(pedido["id"]),
            iv["item_cardapio_id"],
            iv["quantidade"],
            iv["preco_unitario"],
            iv["observacao"],
        )

    pedido_dict = {
        "id": str(pedido["id"]),
        "mesa_numero": mesa["numero"],
        "nome_cliente": nome_cliente,
        "status": pedido["status"],
        "subtotal": float(subtotal),
        "taxa_servico": float(taxa_servico),
        "total": float(pedido["total"]),
        "criado_em": pedido["criado_em"].isoformat() if pedido["criado_em"] else None,
        "itens": itens_validados,
    }

    if _socketio:
        _socketio.emit("novo_pedido", pedido_dict, room=str(restaurante_id))

    return jsonify(pedido_dict), 201

   

@pedidos_bp.get("/<pedido_id>/publico")
def consultar_pedido_publico(pedido_id):
    """GET /api/pedidos/{id}/publico — cliente consulta status do próprio pedido."""
    pedido = repo.buscar_por_id(pedido_id)
    if not pedido:
        return jsonify({"erro": "Pedido não encontrado"}), 404

    itens = repo.buscar_itens_do_pedido(pedido_id)
    return jsonify({
        "id": str(pedido["id"]),
        "mesa_numero": pedido["mesa_numero"],
        "nome_cliente": pedido["nome_cliente"],
        "status": pedido["status"],
        "total": float(pedido["total"]),
        "criado_em": pedido["criado_em"].isoformat() if pedido["criado_em"] else None,
        "itens": [{
            "item_nome": i["item_nome"],
            "quantidade": i["quantidade"],
            "preco_unitario": float(i["preco_unitario"]),
        } for i in itens],
    })



# ─── ADMIN: listar e atualizar ───────────────────────────────

@pedidos_bp.get("")
@requer_auth
def listar_pedidos():
    status = request.args.get("status")
    pedidos = repo.listar_por_restaurante(request.restaurante_id, status)
    resultado = []
    for p in pedidos:
        itens = repo.buscar_itens_do_pedido(str(p["id"]))
        resultado.append({
            **dict(p),
            "total": float(p["total"]),
            "criado_em": p["criado_em"].isoformat() if p["criado_em"] else None,
            "atualizado_em": p["atualizado_em"].isoformat() if p.get("atualizado_em") else None,
            "itens": [{**dict(i), "preco_unitario": float(i["preco_unitario"])} for i in itens],
        })
    return jsonify(resultado)


@pedidos_bp.patch("/<pedido_id>/status")
@requer_auth
def atualizar_status(pedido_id):
    data = request.get_json(silent=True) or {}
    novo_status = data.get("status")
    status_validos = ["recebido", "em_preparo", "pronto", "entregue", "cancelado"]
    if novo_status not in status_validos:
        return jsonify({"erro": "Status inválido"}), 400

    pedido = repo.atualizar_status(pedido_id, request.restaurante_id, novo_status)
    if not pedido:
        return jsonify({"erro": "Pedido não encontrado"}), 404

    atualizado = {
        "id": str(pedido["id"]),
        "status": pedido["status"],
        "atualizado_em": pedido["atualizado_em"].isoformat() if pedido.get("atualizado_em") else None,
    }
    if _socketio:
        _socketio.emit("status_atualizado", atualizado, room=str(request.restaurante_id))

    return jsonify(atualizado)
