from flask import Blueprint, request, jsonify
from app.services.auth_service import hash_senha, verificar_senha, gerar_token, requer_auth
from app.services.viacep_service import buscar_cep
from app.repositories import restaurante_repository as repo
from app.repositories import cardapio_repository as cardapio_repo

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.post("/login")
def login():
    """POST /api/admin/login — autentica e retorna JWT."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha", "")

    if not email or not senha:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400

    restaurante = repo.buscar_por_email(email)
    if not restaurante or not verificar_senha(senha, restaurante["senha_hash"]):
        return jsonify({"erro": "Credenciais inválidas"}), 401

    token = gerar_token(str(restaurante["id"]), restaurante["email"])
    return jsonify({
        "token": token,
        "restaurante": {
            "id": str(restaurante["id"]),
            "nome": restaurante["nome"],
            "email": restaurante["email"],
        }
    })


@admin_bp.post("/registro")
def registro():
    """POST /api/admin/registro — cria novo restaurante."""
    data = request.get_json(silent=True) or {}
    campos = ["nome", "email", "senha", "telefone", "cep"]
    for c in campos:
        if not data.get(c):
            return jsonify({"erro": f"Campo '{c}' é obrigatório"}), 400

    email = data["email"].strip().lower()
    if repo.buscar_por_email(email):
        return jsonify({"erro": "E-mail já cadastrado"}), 409

    addr = buscar_cep(data["cep"]) or {}
    hashed = hash_senha(data["senha"])

    novo = repo.criar(
        nome=data["nome"],
        email=email,
        senha_hash=hashed,
        telefone=data.get("telefone"),
        cep=data.get("cep"),
        cidade=addr.get("localidade", data.get("cidade", "")),
        estado=addr.get("uf", data.get("estado", "")),
        logradouro=addr.get("logradouro", data.get("logradouro", "")),
        bairro=addr.get("bairro", data.get("bairro", "")),
    )

    # Categorias padrão (para não deixar o cardápio vazio)
    defaults = [
        ("Entradas", 1),
        ("Pratos Principais", 2),
        ("Sobremesas", 3),
        ("Bebidas", 4),
    ]
    for nome_cat, ordem in defaults:
        try:
            cardapio_repo.criar_categoria(str(novo["id"]), nome_cat, ordem)
        except Exception:
            # Se falhar (ex.: conexão), não impede registro
            pass

    token = gerar_token(str(novo["id"]), novo["email"])
    return jsonify({"token": token, "restaurante": dict(novo)}), 201


@admin_bp.get("/me")
@requer_auth
def me():
    """GET /api/admin/me — dados do restaurante autenticado."""
    r = repo.buscar_por_id(request.restaurante_id)
    if not r:
        return jsonify({"erro": "Restaurante não encontrado"}), 404
    return jsonify(dict(r))


@admin_bp.put("/restaurante")
@requer_auth
def atualizar_restaurante():
    """PUT /api/admin/restaurante — atualiza dados do restaurante."""
    data = request.get_json(silent=True) or {}
    cep = data.get("cep", "")
    addr = buscar_cep(cep) if cep else {}

    atualizado = repo.atualizar(
        rid=request.restaurante_id,
        nome=data.get("nome", ""),
        telefone=data.get("telefone", ""),
        cep=cep,
        cidade=addr.get("localidade", data.get("cidade", "")),
        estado=addr.get("uf", data.get("estado", "")),
        logradouro=addr.get("logradouro", data.get("logradouro", "")),
        bairro=addr.get("bairro", data.get("bairro", "")),
    )
    return jsonify(dict(atualizado))
