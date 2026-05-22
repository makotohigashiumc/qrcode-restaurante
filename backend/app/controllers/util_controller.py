from flask import Blueprint, jsonify
from app.services.viacep_service import buscar_cep

util_bp = Blueprint("util", __name__, url_prefix="/api")


@util_bp.get("/cep/<cep>")
def consultar_cep(cep):
    """GET /api/cep/{cep} — proxy público para a API ViaCEP."""
    data = buscar_cep(cep)
    if not data:
        return jsonify({"erro": "CEP não encontrado"}), 404
    return jsonify(data)
