try:
    import eventlet  # type: ignore
    eventlet.monkey_patch()
except Exception:
    eventlet = None

import os
import atexit
import signal
from dotenv import load_dotenv

load_dotenv()

from app import create_app, socketio

app = create_app()


# ──────────────────────────────────────────────────────────────
# Cleanup de conexões no encerramento do processo
# ──────────────────────────────────────────────────────────────
# Quando o servidor é parado com Ctrl+C ou SIGTERM (Render, Docker),
# as conexões pg8000 abertas em g._db_conn ficam "penduradas" no
# Supabase Session Pooler até o timeout do servidor (≈ 5–10 min).
# Isso causa o erro EMAXCONNSESSION na próxima inicialização.
# O atexit garante que as conexões ativas sejam fechadas de forma limpa.

def _graceful_shutdown(*_args):
    """Fecha a conexão global de diagnóstico (se houver) e encerra."""
    try:
        from app.database import close_request_connection
        # Conexões por request já foram fechadas pelo teardown do Flask.
        # Aqui protegemos o pool encerrando qualquer remanescente.
        close_request_connection()
    except Exception:
        pass


atexit.register(_graceful_shutdown)

# Captura SIGTERM (Render/Docker encerra via SIGTERM, não Ctrl+C)
try:
    signal.signal(signal.SIGTERM, _graceful_shutdown)
except (OSError, ValueError):
    # Windows não suporta SIGTERM via signal.signal fora do thread principal
    pass


# ──────────────────────────────────────────────────────────────
# Entrada principal
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug)
