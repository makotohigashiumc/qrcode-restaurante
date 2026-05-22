import os
from flask import Blueprint, request, jsonify
from app.services.auth_service import requer_auth
from app.services.qrcode_service import gerar_qrcode_base64
from app.repositories import mesa_repository as repo

mesas_bp = Blueprint("mesas", __name__, url_prefix="/api")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@mesas_bp.get("/mesas")
@requer_auth
def listar_mesas():
    mesas = repo.listar_por_restaurante(request.restaurante_id)
    return jsonify([dict(m) for m in mesas])


@mesas_bp.post("/mesas")
@requer_auth
def criar_mesa():
    data = request.get_json(silent=True) or {}
    numero = data.get("numero")
    if numero is None:
        return jsonify({"erro": "Número da mesa é obrigatório"}), 400

    mesa = repo.criar(request.restaurante_id, int(numero))
    url = f"{FRONTEND_URL}/?mesa={mesa['numero']}&restaurante={request.restaurante_id}"
    qr = gerar_qrcode_base64(url)
    repo.atualizar_qrcode(str(mesa["id"]), qr)
    mesa = repo.buscar_por_id(str(mesa["id"]))
    return jsonify(dict(mesa)), 201


@mesas_bp.delete("/mesas/<mesa_id>")
@requer_auth
def deletar_mesa(mesa_id):
    repo.deletar(mesa_id, request.restaurante_id)
    return jsonify({"ok": True})


@mesas_bp.get("/mesas/verificar")
def verificar_mesa():
    """GET /api/mesas/verificar?restaurante=id&numero=N — uso público pelo cliente."""
    restaurante_id = request.args.get("restaurante")
    numero = request.args.get("numero")
    if not restaurante_id or not numero:
        return jsonify({"erro": "Parâmetros ausentes"}), 400
    mesa = repo.buscar_por_numero(restaurante_id, int(numero))
    if not mesa:
        return jsonify({"erro": "Mesa não encontrada ou inativa"}), 404
    return jsonify({"id": str(mesa["id"]), "numero": mesa["numero"], "ativa": mesa["ativa"]})
