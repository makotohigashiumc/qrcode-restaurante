from flask import Blueprint, request, jsonify
from flask_socketio import emit
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from app.services.auth_service import requer_auth
from app.repositories import pedido_repository as repo, mesa_repository as mesa_repo, cardapio_repository as cardapio_repo
from app.database import execute_write, execute_query

pedidos_bp = Blueprint("pedidos", __name__, url_prefix="/api/pedidos")

_socketio = None


def init_socketio(sio):
    global _socketio
    _socketio = sio


# PÚBLICO: criar pedido

@pedidos_bp.post("")
def criar_pedido():
    data           = request.get_json(silent=True) or {}
    restaurante_id = data.get("restaurante_id")
    numero_mesa    = data.get("mesa_numero")
    nome_cliente   = data.get("nome_cliente", "").strip()
    itens          = data.get("itens", [])

    if not restaurante_id or not numero_mesa or not itens:
        return jsonify({"erro": "Dados incompletos"}), 400

    mesa = mesa_repo.buscar_por_numero(restaurante_id, int(numero_mesa))
    if not mesa:
        return jsonify({"erro": "Mesa inválida"}), 400

    subtotal = Decimal("0.00")
    itens_validados = []
    for it in itens:
        item = cardapio_repo.buscar_item(it["item_id"], restaurante_id)
        if not item or not item["disponivel"] or item.get("deletado_em"):
            return jsonify({"erro": "Item indisponível ou não encontrado"}), 400
        qtd       = max(1, int(it.get("quantidade", 1)))
        preco_dec = Decimal(str(item["preco"]))
        subtotal += preco_dec * Decimal(qtd)
        itens_validados.append({
            "item_cardapio_id": str(item["id"]),
            "quantidade":       qtd,
            "preco_unitario":   float(preco_dec),
            "observacao":       it.get("observacao", ""),
        })

    total = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    pedido = repo.criar_pedido(str(mesa["id"]), restaurante_id, nome_cliente, float(total))
    for iv in itens_validados:
        repo.criar_item_pedido(
            str(pedido["id"]), iv["item_cardapio_id"],
            iv["quantidade"], iv["preco_unitario"], iv["observacao"],
        )

    pedido_dict = {
        "id":           str(pedido["id"]),
        "mesa_numero":  mesa["numero"],
        "nome_cliente": nome_cliente,
        "status":       pedido["status"],
        "total":        float(pedido["total"]),
        "criado_em":    pedido["criado_em"].isoformat() if pedido["criado_em"] else None,
        "itens": [{
            "item_nome":      cardapio_repo.buscar_item(iv["item_cardapio_id"], restaurante_id)["nome"]
                              if False else iv.get("item_nome", ""),
            "quantidade":     iv["quantidade"],
            "preco_unitario": iv["preco_unitario"],
        } for iv in itens_validados],
    }

    # Busca os itens com nome para retornar ao cliente
    itens_com_nome = repo.buscar_itens_do_pedido(str(pedido["id"]))
    pedido_dict["itens"] = [{
        "item_nome":      i["item_nome"],
        "quantidade":     i["quantidade"],
        "preco_unitario": float(i["preco_unitario"]),
    } for i in itens_com_nome]

    if _socketio:
        _socketio.emit("novo_pedido", pedido_dict, room=str(restaurante_id))

    return jsonify(pedido_dict), 201


# PÚBLICO: consultar status de um pedido

@pedidos_bp.get("/<pedido_id>/publico")
def consultar_pedido_publico(pedido_id):
    pedido = repo.buscar_por_id(pedido_id)
    if not pedido:
        return jsonify({"erro": "Pedido não encontrado"}), 404
    itens = repo.buscar_itens_do_pedido(pedido_id)
    return jsonify({
        "id":           str(pedido["id"]),
        "mesa_numero":  pedido["mesa_numero"],
        "nome_cliente": pedido["nome_cliente"],
        "status":       pedido["status"],
        "total":        float(pedido["total"]),
        "criado_em":    pedido["criado_em"].isoformat() if pedido["criado_em"] else None,
        "itens": [{
            "item_nome":      i["item_nome"],
            "quantidade":     i["quantidade"],
            "preco_unitario": float(i["preco_unitario"]),
        } for i in itens],
    })


# PÚBLICO: pedidos ativos da sessão atual da mesa
# diretamente do backend, sem depender do localStorage.

@pedidos_bp.get("/mesa/<int:numero_mesa>/ativos")
def pedidos_ativos_mesa(numero_mesa):
    restaurante_id = request.args.get("restaurante")
    if not restaurante_id:
        return jsonify({"erro": "Parâmetro restaurante ausente"}), 400

    mesa = mesa_repo.buscar_por_numero(restaurante_id, numero_mesa)
    if not mesa:
        return jsonify({"erro": "Mesa não encontrada"}), 404

    ultima_lib = mesa.get("ultima_liberacao")

    todos = repo.listar_por_restaurante(restaurante_id, status=None)
    pedidos_sessao = []
    for p in todos:
        if p.get("mesa_numero") != numero_mesa:
            continue
        # Descarta pedidos anteriores à última liberação
        if ultima_lib and p.get("criado_em") and p["criado_em"] <= ultima_lib:
            continue
        itens = repo.buscar_itens_do_pedido(str(p["id"]))
        pedidos_sessao.append({
            "id":           str(p["id"]),
            "nome_cliente": p["nome_cliente"],
            "status":       p["status"],
            "total":        float(p["total"]),
            "criado_em":    p["criado_em"].isoformat() if p["criado_em"] else None,
            "itens": [{
                "item_nome":      i["item_nome"],
                "quantidade":     i["quantidade"],
                "preco_unitario": float(i["preco_unitario"]),
            } for i in itens],
        })

    return jsonify({
        "pedidos":        pedidos_sessao,
        "ultima_liberacao": ultima_lib.isoformat() if ultima_lib else None,
    })


# ADMIN: listar pedidos

@pedidos_bp.get("")
@requer_auth
def listar_pedidos():
    status      = request.args.get("status")
    mesa        = request.args.get("mesa")
    data_filtro = request.args.get("data")

    pedidos = repo.listar_por_restaurante(request.restaurante_id, status)

    mesas_lib = {}
    try:
        rows = execute_query(
            "SELECT numero, ultima_liberacao FROM mesas WHERE restaurante_id = %s",
            (request.restaurante_id,)
        )
        for r in rows:
            mesas_lib[r["numero"]] = r["ultima_liberacao"]
    except Exception:
        pass

    resultado = []
    for p in pedidos:
        if mesa and str(p.get("mesa_numero")) != str(mesa):
            continue
        if data_filtro and p.get("criado_em"):
            if p["criado_em"].strftime("%Y-%m-%d") != data_filtro:
                continue
        ultima_lib = mesas_lib.get(p.get("mesa_numero"))
        if ultima_lib and p.get("criado_em") and p["criado_em"] <= ultima_lib:
            continue
        itens = repo.buscar_itens_do_pedido(str(p["id"]))
        resultado.append({
            **dict(p),
            "total":         float(p["total"]),
            "criado_em":     p["criado_em"].isoformat() if p["criado_em"] else None,
            "atualizado_em": p.get("atualizado_em", p["criado_em"]).isoformat() if p.get("atualizado_em") else None,
            "itens": [{**dict(i), "preco_unitario": float(i["preco_unitario"])} for i in itens],
        })
    return jsonify(resultado)


# ADMIN: atualizar status

@pedidos_bp.patch("/<pedido_id>/status")
@requer_auth
def atualizar_status(pedido_id):
    data = request.get_json(silent=True) or {}
    novo_status = data.get("status")
    if novo_status not in ["recebido", "em_preparo", "pronto", "entregue", "cancelado"]:
        return jsonify({"erro": "Status inválido"}), 400

    pedido = repo.atualizar_status(pedido_id, request.restaurante_id, novo_status)
    if not pedido:
        return jsonify({"erro": "Pedido não encontrado"}), 404

    atualizado = {"id": str(pedido["id"]), "status": pedido["status"]}
    if _socketio:
        _socketio.emit("status_atualizado", atualizado, room=str(request.restaurante_id))
    return jsonify(atualizado)


# ADMIN: relatório da mesa

@pedidos_bp.get("/mesa/<int:numero_mesa>/relatorio")
@requer_auth
def relatorio_mesa(numero_mesa):
    mesa = mesa_repo.buscar_por_numero(request.restaurante_id, numero_mesa)
    if not mesa:
        return jsonify({"erro": "Mesa não encontrada"}), 404

    ultima_lib = mesa.get("ultima_liberacao")
    todos = repo.listar_por_restaurante(request.restaurante_id, status=None)
    pedidos_mesa = []
    for p in todos:
        if p.get("mesa_numero") != numero_mesa:
            continue
        if p.get("status") == "cancelado":
            continue
        if ultima_lib and p.get("criado_em") and p["criado_em"] <= ultima_lib:
            continue
        pedidos_mesa.append(p)

    clientes = {}
    total_geral = 0.0
    for p in pedidos_mesa:
        itens = repo.buscar_itens_do_pedido(str(p["id"]))
        nome = p["nome_cliente"] or "Sem nome"
        if nome not in clientes:
            clientes[nome] = {"nome": nome, "pedidos": [], "total": 0.0}
        pedido_r = {
            "id":        str(p["id"]),
            "status":    p["status"],
            "total":     float(p["total"]),
            "criado_em": p["criado_em"].isoformat() if p["criado_em"] else None,
            "itens": [{
                "item_nome":      i["item_nome"],
                "quantidade":     i["quantidade"],
                "preco_unitario": float(i["preco_unitario"]),
                "subtotal":       float(i["preco_unitario"]) * i["quantidade"],
            } for i in itens],
        }
        clientes[nome]["pedidos"].append(pedido_r)
        clientes[nome]["total"] += float(p["total"])
        total_geral += float(p["total"])

    return jsonify({
        "mesa":             numero_mesa,
        "clientes":         list(clientes.values()),
        "total_geral":      round(total_geral, 2),
        "sessao_desde":     ultima_lib.isoformat() if ultima_lib else None,
    })


# ADMIN: liberar mesa

@pedidos_bp.post("/mesa/<int:numero_mesa>/liberar")
@requer_auth
def liberar_mesa(numero_mesa):
    mesa = mesa_repo.buscar_por_numero(request.restaurante_id, numero_mesa)
    if not mesa:
        return jsonify({"erro": "Mesa não encontrada"}), 404

    todos = repo.listar_por_restaurante(request.restaurante_id, status=None)
    pedidos_ativos = [
        p for p in todos
        if p.get("mesa_numero") == numero_mesa
        and p.get("status") not in ("entregue", "cancelado")
    ]

    for p in pedidos_ativos:
        repo.atualizar_status(str(p["id"]), request.restaurante_id, "entregue")

    agora = datetime.now(timezone.utc)
    execute_write(
        "UPDATE mesas SET ultima_liberacao = %s WHERE id = %s",
        (agora, str(mesa["id"]))
    )

    if _socketio:
        _socketio.emit(
            "mesa_liberada",
            {"mesa_numero": numero_mesa, "pedidos_finalizados": len(pedidos_ativos)},
            room=str(request.restaurante_id),
        )

    return jsonify({
        "mensagem":            f"Mesa {numero_mesa} liberada. {len(pedidos_ativos)} pedido(s) finalizado(s).",
        "pedidos_finalizados": len(pedidos_ativos),
        "liberada_em":         agora.isoformat(),
    })
