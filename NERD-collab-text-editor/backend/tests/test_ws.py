import pytest
import asyncio
from socketio import AsyncClient
from httpx import AsyncClient as HttpxClient

from main import fastapi_app, app as asgi_app
from store.memory import users, documents


@pytest.mark.asyncio
async def test_websocket_connect_and_join_document():
    users.clear()
    documents.clear()
    async with HttpxClient(app=fastapi_app, base_url="http://test") as ac:
        register = await ac.post("/api/auth/register", json={"username": "alice", "password": "pass"})
        token = register.json()["access_token"]
        create_resp = await ac.post("/api/documents", json={"title": "Doc", "content": "Hello"}, headers={"Authorization": f"Bearer {token}"})
        doc_id = create_resp.json()["id"]

    client = AsyncClient()
    received = {}

    @client.on("user_joined")
    async def on_user_joined(data):
        received["joined"] = data

    await client.connect("http://test", socketio_path="/socket.io", auth={"token": token}, transports=["websocket"], app=asgi_app)
    await client.emit("join_document", {"doc_id": doc_id})
    await asyncio.sleep(0.1)
    assert received.get("joined") is not None
    await client.disconnect()


@pytest.mark.asyncio
async def test_websocket_invalid_token_rejected():
    client = AsyncClient()
    with pytest.raises(Exception):
        await client.connect("http://test", socketio_path="/socket.io", auth={"token": "bad"}, transports=["websocket"], app=asgi_app)
