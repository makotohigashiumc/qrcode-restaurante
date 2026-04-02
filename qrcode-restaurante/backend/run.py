try:
    import eventlet  # type: ignore
    eventlet.monkey_patch()
except Exception:
    eventlet = None

import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") == "development")
