from flask import Blueprint, request, jsonify
from app.services.auth_service import requer_auth
from app.repositories import cardapio_repository as repo

cardapio_bp = Blueprint("cardapio", __name__, url_prefix="/api")


# ─── PÚBLICO ────────────────────────────────────────────────

@cardapio_bp.get("/cardapio/<restaurante_id>")
def get_cardapio(restaurante_id):
    """GET /api/cardapio/{id} — retorna itens disponíveis agrupados por categoria."""
    itens = repo.listar_itens(restaurante_id, apenas_disponiveis=True)
    categorias = repo.listar_categorias(restaurante_id)

    cat_map = {}
    for cat in categorias:
        cat_map[str(cat["id"])] = {
            "id": str(cat["id"]),
            "nome": cat["nome"],
            "ordem": cat["ordem"],
            "itens": []
        }

    sem_categoria = {"id": None, "nome": "Outros", "ordem": 999, "itens": []}

    for item in itens:
        item_dict = {
            "id": str(item["id"]),
            "nome": item["nome"],
            "descricao": item["descricao"],
            "preco": float(item["preco"]),
            "imagem_url": item["imagem_url"],
            "disponivel": item["disponivel"],
            "categoria_id": str(item["categoria_id"]) if item["categoria_id"] else None,
        }
        cid = str(item["categoria_id"]) if item["categoria_id"] else None
        if cid and cid in cat_map:
            cat_map[cid]["itens"].append(item_dict)
        else:
            sem_categoria["itens"].append(item_dict)

    resultado = sorted(cat_map.values(), key=lambda c: c["ordem"])
    if sem_categoria["itens"]:
        resultado.append(sem_categoria)

    return jsonify(resultado)


# ─── ADMIN — Categorias ──────────────────────────────────────

@cardapio_bp.get("/admin/categorias")
@requer_auth
def listar_categorias():
    cats = repo.listar_categorias(request.restaurante_id)
    return jsonify([dict(c) for c in cats])


@cardapio_bp.post("/admin/categorias")
@requer_auth
def criar_categoria():
    data = request.get_json(silent=True) or {}
    nome = (data.get("nome") or "").strip()
    if not nome:
        return jsonify({"erro": "Nome é obrigatório"}), 400
    existente = repo.buscar_categoria_por_nome(request.restaurante_id, nome)
    if existente:
        return jsonify(dict(existente)), 200

    cat = repo.criar_categoria(request.restaurante_id, nome, data.get("ordem", 0))
    return jsonify(dict(cat)), 201


@cardapio_bp.put("/admin/categorias/<cat_id>")
@requer_auth
def atualizar_categoria(cat_id):
    data = request.get_json(silent=True) or {}
    cat = repo.atualizar_categoria(cat_id, request.restaurante_id, data.get("nome", ""), data.get("ordem", 0))
    if not cat:
        return jsonify({"erro": "Categoria não encontrada"}), 404
    return jsonify(dict(cat))


@cardapio_bp.delete("/admin/categorias/<cat_id>")
@requer_auth
def deletar_categoria(cat_id):
    repo.deletar_categoria(cat_id, request.restaurante_id)
    return jsonify({"ok": True})


# ─── ADMIN — Itens ───────────────────────────────────────────

@cardapio_bp.get("/admin/itens")
@requer_auth
def listar_itens():
    itens = repo.listar_itens(request.restaurante_id)
    return jsonify([{**dict(i), "preco": float(i["preco"])} for i in itens])


@cardapio_bp.post("/admin/itens")
@requer_auth
def criar_item():
    data = request.get_json(silent=True) or {}
    if not data.get("nome") or data.get("preco") is None:
        return jsonify({"erro": "Nome e preço são obrigatórios"}), 400
    item = repo.criar_item(
        restaurante_id=request.restaurante_id,
        categoria_id=data.get("categoria_id"),
        nome=data["nome"],
        descricao=data.get("descricao", ""),
        preco=data["preco"],
        imagem_url=data.get("imagem_url", ""),
        disponivel=data.get("disponivel", True),
    )
    return jsonify({**dict(item), "preco": float(item["preco"])}), 201


@cardapio_bp.put("/admin/itens/<item_id>")
@requer_auth
def atualizar_item(item_id):
    data = request.get_json(silent=True) or {}
    item = repo.atualizar_item(
        item_id=item_id,
        restaurante_id=request.restaurante_id,
        categoria_id=data.get("categoria_id"),
        nome=data.get("nome", ""),
        descricao=data.get("descricao", ""),
        preco=data.get("preco", 0),
        imagem_url=data.get("imagem_url", ""),
        disponivel=data.get("disponivel", True),
    )
    if not item:
        return jsonify({"erro": "Item não encontrado"}), 404
    return jsonify({**dict(item), "preco": float(item["preco"])})


@cardapio_bp.delete("/admin/itens/<item_id>")
@requer_auth
def deletar_item(item_id):
    repo.deletar_item(item_id, request.restaurante_id)
    return jsonify({"ok": True})
