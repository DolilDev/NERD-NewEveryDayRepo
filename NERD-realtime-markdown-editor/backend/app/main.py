"""Application entry point for the collaborative Markdown editor backend.

Run locally with::

    uvicorn app.main:app --reload

The app serves the built TypeScript client (``frontend/dist``) and exposes a
``/health`` route. The Socket.IO realtime layer is mounted in a later step.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

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

app = FastAPI(title="Real-Time Collaborative Markdown Editor")


@app.get("/health")
async def health() -> dict:
    """Liveness probe used by tooling and tests."""
    return {"status": "ok"}


if INDEX_FILE.is_file():
    # Serve the built client at the root; assets (bundle.js, styles.css, ...)
    # are referenced relatively from index.html and resolved by this mount.
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
else:

    @app.get("/", response_class=HTMLResponse)
    async def index_fallback() -> str:
        """Placeholder served until the frontend bundle exists."""
        return _FALLBACK_HTML
