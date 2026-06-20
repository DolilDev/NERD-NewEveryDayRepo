"""Application entry point for the collaborative Markdown editor backend.

Run locally with::

    uvicorn app.main:app --reload

This module currently exposes a minimal FastAPI stub; later steps add static
client serving, a health check, and the Socket.IO realtime layer.
"""

from fastapi import FastAPI

app = FastAPI(title="Real-Time Collaborative Markdown Editor")


@app.get("/")
async def root() -> dict:
    """Placeholder root route — replaced by the static client in a later step."""
    return {"name": "Real-Time Collaborative Markdown Editor", "status": "ok"}
