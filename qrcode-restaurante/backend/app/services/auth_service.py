import os
import jwt
import bcrypt
import secrets
import threading
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from app.services.validators import validar_senha, validar_email
from app.services.email_service import enviar_verificacao, enviar_recuperacao
from app.database import execute_query, execute_write

auth_rf_bp = Blueprint("auth_rf", __name__)

JWT_SECRET    = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGO      = "HS256"
JWT_EXP_HOURS = 8


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt(12)).decode()


def verificar_senha(senha: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), hashed.encode())
    except Exception:
        return False


def gerar_token(restaurante_id: str, email: str) -> str:
    payload = {
        "sub": str(restaurante_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


def requer_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"erro": "Token não fornecido"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decodificar_token(token)
            request.restaurante_id = payload["sub"]
            request.email = payload["email"]
        except jwt.ExpiredSignatureError:
            return jsonify({"erro": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"erro": "Token inválido"}), 401
        return f(*args, **kwargs)
    return decorated


def _gerar_token_url() -> str:
    return secrets.token_urlsafe(32)


def _enviar_bg(app, fn, *args):
    """Executa função de e-mail em background sem bloquear a resposta HTTP."""
    def run():
        with app.app_context():
            try:
                fn(*args)
            except Exception as e:
                app.logger.warning(f"Falha ao enviar e-mail em background: {e}")
    t = threading.Thread(target=run)
    t.daemon = True
    t.start()


# ── RF02: Confirmar e-mail ───────────────────────────────────

@auth_rf_bp.route("/api/verificar-email/<token>", methods=["GET"])
def verificar_email(token: str):
    row = execute_query(
        "SELECT id, email_verificado, token_verif_expira FROM restaurantes WHERE token_verificacao = %s LIMIT 1",
        (token,), fetchone=True
    )
    if not row:
        return jsonify({"erro": "Token inválido ou já utilizado."}), 400
    if row["email_verificado"]:
        return jsonify({"mensagem": "E-mail já confirmado."}), 200
    expira = row["token_verif_expira"]
    if expira and expira < datetime.now(timezone.utc):
        return jsonify({"erro": "Link expirado. Solicite um novo."}), 410
    execute_write(
        "UPDATE restaurantes SET email_verificado=TRUE, token_verificacao=NULL, token_verif_expira=NULL WHERE id=%s",
        (row["id"],)
    )
    return jsonify({"mensagem": "E-mail confirmado! Faça login."}), 200


# ── RF02: Reenviar verificação ───────────────────────────────

@auth_rf_bp.route("/api/reenviar-verificacao", methods=["POST"])
def reenviar_verificacao():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"erro": "Informe o e-mail."}), 400

    RESP = {"mensagem": "Se cadastrado e não confirmado, um novo link foi enviado."}
    row = execute_query(
        "SELECT id, nome, email_verificado FROM restaurantes WHERE email=%s LIMIT 1",
        (email,), fetchone=True
    )
    if not row or row["email_verificado"]:
        return jsonify(RESP), 200

    token  = _gerar_token_url()
    expira = datetime.now(timezone.utc) + timedelta(hours=24)
    execute_write(
        "UPDATE restaurantes SET token_verificacao=%s, token_verif_expira=%s WHERE id=%s",
        (token, expira, row["id"])
    )

    app = current_app._get_current_object()
    _enviar_bg(app, enviar_verificacao, email, row["nome"], token)

    return jsonify(RESP), 200


# ── RF05: Esqueci a senha ────────────────────────────────────

@auth_rf_bp.route("/api/esqueci-senha", methods=["POST"])
def esqueci_senha():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"erro": "Informe o e-mail."}), 400

    RESP = {"mensagem": "Se o e-mail estiver cadastrado, você receberá as instruções."}

    row = execute_query(
        "SELECT id, nome FROM restaurantes WHERE email=%s LIMIT 1",
        (email,), fetchone=True
    )
    if not row:
        return jsonify(RESP), 200

    execute_write(
        "UPDATE tokens_recuperacao SET usado=TRUE WHERE restaurante_id=%s",
        (row["id"],)
    )
    token  = _gerar_token_url()
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    execute_write(
        "INSERT INTO tokens_recuperacao (restaurante_id, token, expira_em) VALUES (%s,%s,%s)",
        (row["id"], token, expira)
    )

    # Envia em background — resposta volta imediatamente
    app = current_app._get_current_object()
    _enviar_bg(app, enviar_recuperacao, email, row["nome"], token)

    return jsonify(RESP), 200


# ── RF05: Validar token ──────────────────────────────────────

@auth_rf_bp.route("/api/validar-token-recuperacao/<token>", methods=["GET"])
def validar_token_recuperacao(token: str):
    row = execute_query(
        "SELECT id, expira_em FROM tokens_recuperacao WHERE token=%s AND usado=FALSE LIMIT 1",
        (token,), fetchone=True
    )
    if not row:
        return jsonify({"valido": False, "erro": "Token inválido."}), 400
    if row["expira_em"] < datetime.now(timezone.utc):
        return jsonify({"valido": False, "erro": "Token expirado."}), 410
    return jsonify({"valido": True}), 200


# ── RF05: Nova senha ─────────────────────────────────────────

@auth_rf_bp.route("/api/nova-senha", methods=["POST"])
def nova_senha():
    data     = request.get_json(silent=True) or {}
    token    = (data.get("token") or "").strip()
    nova_sen = data.get("nova_senha") or ""

    if not token or not nova_sen:
        return jsonify({"erro": "Token e nova senha são obrigatórios."}), 400

    valida, erros = validar_senha(nova_sen)
    if not valida:
        return jsonify({"erro": "Senha fraca.", "detalhes": erros}), 422

    row = execute_query(
        "SELECT id, restaurante_id, expira_em FROM tokens_recuperacao WHERE token=%s AND usado=FALSE LIMIT 1",
        (token,), fetchone=True
    )
    if not row:
        return jsonify({"erro": "Token inválido ou já utilizado."}), 400
    if row["expira_em"] < datetime.now(timezone.utc):
        return jsonify({"erro": "Token expirado."}), 410

    nova_hash = bcrypt.hashpw(nova_sen.encode(), bcrypt.gensalt()).decode()
    execute_write("UPDATE restaurantes SET senha_hash=%s WHERE id=%s", (nova_hash, row["restaurante_id"]))
    execute_write("UPDATE tokens_recuperacao SET usado=TRUE WHERE id=%s", (row["id"],))

    return jsonify({"mensagem": "Senha redefinida! Faça login."}), 200
