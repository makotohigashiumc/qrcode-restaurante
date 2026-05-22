import base64, os, uuid
from flask import Blueprint, request, jsonify, current_app
from app.services.auth_service import requer_auth
from app.repositories import cardapio_repository as repo
from app.database import execute_query

cardapio_bp = Blueprint("cardapio", __name__, url_prefix="/api")


# ─── PÚBLICO ────────────────────────────────────────────────

@cardapio_bp.get("/cardapio/<restaurante_id>")
def get_cardapio(restaurante_id):
    """GET /api/cardapio/{id} — itens disponíveis agrupados por categoria."""
    # Exclui itens com soft-delete
    itens = repo.listar_itens(restaurante_id, apenas_disponiveis=True)
    categorias = repo.listar_categorias(restaurante_id)

    cat_map = {}
    for cat in categorias:
        cat_map[str(cat["id"])] = {
            "id": str(cat["id"]), "nome": cat["nome"],
            "ordem": cat["ordem"], "itens": []
        }

    sem_categoria = {"id": None, "nome": "Outros", "ordem": 999, "itens": []}

    for item in itens:
        # Pula itens com soft-delete
        if item.get("deletado_em"):
            continue
        item_dict = {
            "id": str(item["id"]), "nome": item["nome"],
            "descricao": item["descricao"], "preco": float(item["preco"]),
            "imagem_url": item["imagem_url"], "disponivel": item["disponivel"],
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
    # Exclui itens com soft-delete da listagem admin
    return jsonify([
        {**dict(i), "preco": float(i["preco"])}
        for i in itens
        if not i.get("deletado_em")
    ])


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
    """
    Tenta deletar fisicamente o item.
    Se o item tiver pedidos associados, faz soft-delete
    (marca como deletado e indisponível) em vez de erro.
    """
    from app.database import execute_write, execute_query as eq
    from datetime import datetime, timezone

    # Verifica se o item tem pedidos associados
    uso = eq(
        "SELECT COUNT(*) as total FROM itens_pedido WHERE item_cardapio_id = %s",
        (item_id,), fetchone=True
    )
    tem_pedidos = uso and uso["total"] > 0

    if tem_pedidos:
        # Soft-delete: desativa e marca como deletado
        execute_write(
            """UPDATE itens_cardapio
               SET disponivel = FALSE, deletado_em = %s
               WHERE id = %s AND restaurante_id = %s""",
            (datetime.now(timezone.utc), item_id, request.restaurante_id)
        )
        return jsonify({
            "ok": True,
            "aviso": "Item desativado pois possui pedidos associados. Não aparece mais no cardápio."
        })
    else:
        repo.deletar_item(item_id, request.restaurante_id)
        return jsonify({"ok": True})


# ─── ADMIN — Upload de imagem ────────────────────────────────

@cardapio_bp.post("/admin/itens/upload-imagem")
@requer_auth
def upload_imagem():
    """
    POST /api/admin/itens/upload-imagem
    Aceita imagem em base64 (JSON) ou multipart/form-data.
    Salva localmente e retorna a URL para usar no item.
    """
    # Pasta de uploads estática servida pelo Flask
    upload_dir = os.path.join(current_app.root_path, "..", "uploads", "itens")
    os.makedirs(upload_dir, exist_ok=True)

    if request.is_json:
        # Formato: { "imagem": "data:image/jpeg;base64,..." }
        data = request.get_json(silent=True) or {}
        imagem_b64 = data.get("imagem", "")
        if not imagem_b64:
            return jsonify({"erro": "Campo 'imagem' obrigatório"}), 400

        # Extrai tipo e dados
        if "," in imagem_b64:
            header, dados = imagem_b64.split(",", 1)
            ext = "jpg"
            if "png" in header:  ext = "png"
            elif "webp" in header: ext = "webp"
            elif "gif" in header:  ext = "gif"
        else:
            dados = imagem_b64
            ext = "jpg"

        nome_arquivo = f"{uuid.uuid4().hex}.{ext}"
        caminho = os.path.join(upload_dir, nome_arquivo)
        with open(caminho, "wb") as f:
            f.write(base64.b64decode(dados))

    elif request.files.get("imagem"):
        arquivo = request.files["imagem"]
        ext = arquivo.filename.rsplit(".", 1)[-1].lower() if "." in arquivo.filename else "jpg"
        if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
            return jsonify({"erro": "Formato não suportado. Use jpg, png ou webp."}), 400
        nome_arquivo = f"{uuid.uuid4().hex}.{ext}"
        caminho = os.path.join(upload_dir, nome_arquivo)
        arquivo.save(caminho)
    else:
        return jsonify({"erro": "Envie a imagem em base64 (JSON) ou multipart/form-data"}), 400

    # Retorna URL relativa
    url = f"/uploads/itens/{nome_arquivo}"
    return jsonify({"url": url}), 201
