"""Application entry point for the collaborative Markdown editor backend.

Run locally with::

    uvicorn app.main:app --reload

``app`` is a Socket.IO ASGI application that handles ``/socket.io`` traffic and
delegates everything else to a FastAPI app which serves the built TypeScript
client (``frontend/dist``) and a ``/health`` route.
"""

from pathlib import Path

import socketio
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .session import SessionManager
from .sockets import register_handlers

# backend/app/main.py -> backend/app -> backend -> project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
INDEX_FILE = FRONTEND_DIST / "index.html"

# Shown when the client has not been built yet (run `npm run build` in frontend/).
_FALLBACK_HTML = """<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Markdown Editor — not built</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto;">
    <h1>Frontend not built yet</h1>
    <p>The TypeScript client has not been bundled. Build it and reload:</p>
    <pre>cd frontend &amp;&amp; npm install &amp;&amp; npm run build</pre>
    <p>The backend API is running — try <code>/health</code>.</p>
  </body>
</html>
"""

fastapi_app = FastAPI(title="Real-Time Collaborative Markdown Editor")


@fastapi_app.get("/health")
async def health() -> dict:
    """Liveness probe used by tooling and tests."""
    return {"status": "ok"}


if INDEX_FILE.is_file():
    # Serve the built client at the root; assets (bundle.js, styles.css, ...)
    # are referenced relatively from index.html and resolved by this mount.
    fastapi_app.mount(
        "/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static"
    )
else:

    @fastapi_app.get("/", response_class=HTMLResponse)
    async def index_fallback() -> str:
        """Placeholder served until the frontend bundle exists."""
        return _FALLBACK_HTML


# --- realtime layer -------------------------------------------------------
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
session = SessionManager()
register_handlers(sio, session)

# Combined ASGI app: Socket.IO on /socket.io, FastAPI for everything else.
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
