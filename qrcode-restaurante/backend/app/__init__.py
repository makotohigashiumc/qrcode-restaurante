import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from flask import jsonify
from flask_mail import Mail
from app.services.email_service import mail

from app.controllers.admin_controller import admin_bp
from app.controllers.cardapio_controller import cardapio_bp
from app.controllers.mesas_controller import mesas_bp
from app.controllers.pedidos_controller import pedidos_bp, init_socketio
from app.controllers.util_controller import util_bp
from app.services.auth_service import auth_rf_bp          # ← LINHA ADICIONADA
from app.database import close_request_connection, DatabaseUnavailable

socketio = SocketIO(cors_allowed_origins="*")


def create_app():
    app = Flask(__name__)

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS(app, origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"])

    app.config["MAIL_SERVER"]         = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    app.config["MAIL_PORT"]           = int(os.environ.get("MAIL_PORT", 587))
    app.config["MAIL_USE_TLS"]        = True
    app.config["MAIL_USERNAME"]       = os.environ.get("MAIL_USERNAME")
    app.config["MAIL_PASSWORD"]       = os.environ.get("MAIL_PASSWORD")
    app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("MAIL_DEFAULT_SENDER")
    app.config["FRONTEND_URL"]        = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    mail.init_app(app)

    app.register_blueprint(admin_bp)
    app.register_blueprint(cardapio_bp)
    app.register_blueprint(mesas_bp)
    app.register_blueprint(pedidos_bp)
    app.register_blueprint(util_bp)
    app.register_blueprint(auth_rf_bp)                    # ← LINHA ADICIONADA

    socketio.init_app(app)
    init_socketio(socketio)

    @app.teardown_appcontext
    def _close_db(exception=None):
        close_request_connection()

    @socketio.on("entrar_sala")
    def handle_entrar_sala(data):
        room = data.get("restaurante_id")
        if room:
            join_room(room)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.errorhandler(DatabaseUnavailable)
    def _db_unavailable(err):
        try:
            app.logger.warning("DB indisponível: %r", getattr(err, "__cause__", None) or err)
        except Exception:
            pass
        return jsonify({"erro": "Banco indisponível. Tente novamente."}), 503

    try:
        from pg8000.exceptions import InterfaceError as Pg8000InterfaceError
        @app.errorhandler(Pg8000InterfaceError)
        def _pg8000_network_error(err):
            return jsonify({"erro": "Banco indisponível. Tente novamente."}), 503
    except Exception:
        pass

    try:
        import psycopg2
        @app.errorhandler(psycopg2.OperationalError)
        def _psycopg2_network_error(err):
            return jsonify({"erro": "Banco indisponível. Tente novamente."}), 503
    except Exception:
        pass

    return app
