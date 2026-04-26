from flask import Blueprint, request, jsonify, current_app
from app.services.auth_service import hash_senha, verificar_senha, gerar_token, requer_auth, _gerar_token_url
from app.services.viacep_service import buscar_cep
from app.services.email_service import enviar_verificacao
from app.repositories import restaurante_repository as repo
from app.repositories import cardapio_repository as cardapio_repo
from datetime import datetime, timedelta, timezone
from app.database import execute_write

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.post("/login")
def login():
    """POST /api/admin/login — autentica e retorna JWT."""
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha", "")

    if not email or not senha:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400

    restaurante = repo.buscar_por_email(email)
    if not restaurante or not verificar_senha(senha, restaurante["senha_hash"]):
        return jsonify({"erro": "Credenciais inválidas"}), 401

    # RF02: bloqueia login se e-mail não verificado
    if not restaurante.get("email_verificado", True):
        return jsonify({
            "erro": "E-mail não confirmado.",
            "codigo": "EMAIL_NAO_VERIFICADO",
            "mensagem": "Verifique sua caixa de entrada e clique no link de confirmação.",
        }), 403

    token = gerar_token(str(restaurante["id"]), restaurante["email"])
    return jsonify({
        "token": token,
        "restaurante": {
            "id":    str(restaurante["id"]),
            "nome":  restaurante["nome"],
            "email": restaurante["email"],
        }
    })


@admin_bp.post("/registro")
def registro():
    """POST /api/admin/registro — cria novo restaurante."""
    data   = request.get_json(silent=True) or {}
    campos = ["nome", "email", "senha", "telefone", "cep"]
    for c in campos:
        if not data.get(c):
            return jsonify({"erro": f"Campo '{c}' é obrigatório"}), 400

    email = data["email"].strip().lower()
    if repo.buscar_por_email(email):
        return jsonify({"erro": "E-mail já cadastrado"}), 409

    addr   = buscar_cep(data["cep"]) or {}
    hashed = hash_senha(data["senha"])

    # Token de verificação de e-mail (RF02)
    token_verif = _gerar_token_url()
    expira_verif = datetime.now(timezone.utc) + timedelta(hours=24)

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

    # Salva token de verificação no banco
    execute_write(
        "UPDATE restaurantes SET token_verificacao=%s, token_verif_expira=%s WHERE id=%s",
        (token_verif, expira_verif, str(novo["id"]))
    )

    # Categorias padrão
    defaults = [("Entradas", 1), ("Pratos Principais", 2), ("Sobremesas", 3), ("Bebidas", 4)]
    for nome_cat, ordem in defaults:
        try:
            cardapio_repo.criar_categoria(str(novo["id"]), nome_cat, ordem)
        except Exception:
            pass

    # Envia e-mail de verificação (RF02)
    try:
        enviar_verificacao(email, data["nome"], token_verif)
    except Exception as e:
        current_app.logger.warning(f"Falha ao enviar e-mail de verificação: {e}")

    return jsonify({
        "mensagem": "Cadastro realizado! Verifique seu e-mail para ativar a conta.",
        "email": email,
    }), 201


@admin_bp.get("/me")
@requer_auth
def me():
    r = repo.buscar_por_id(request.restaurante_id)
    if not r:
        return jsonify({"erro": "Restaurante não encontrado"}), 404
    return jsonify(dict(r))


@admin_bp.put("/restaurante")
@requer_auth
def atualizar_restaurante():
    data = request.get_json(silent=True) or {}
    cep  = data.get("cep", "")
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
