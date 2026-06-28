from jose import JWTError, jwt
from socketio import AsyncServer
from fastapi import HTTPException
from typing import Dict

from config import SECRET_KEY, ALGORITHM
from store.memory import (
    active_sessions,
    documents,
    get_user,
    save_snapshot_if_needed,
    add_snapshot,
    get_history,
)

sio = AsyncServer(async_mode="asgi", cors_allowed_origins="*")


def authenticate_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


@sio.event
async def connect(sid, environ, auth):
    token = auth.get("token") if auth else None
    if not token:
        raise ConnectionRefusedError("Missing token")
    user_id = authenticate_token(token)
    if not user_id or not get_user(user_id):
        raise ConnectionRefusedError("Invalid token")
    active_sessions[sid] = {"user_id": user_id, "doc_id": ""}


@sio.event
async def join_document(sid, data):
    user_id = active_sessions.get(sid, {}).get("user_id")
    doc_id = data.get("doc_id")
    document = documents.get(doc_id)
    if not document:
        await sio.emit("error", {"error": "Document not found"}, room=sid)
        return
    if user_id != document["owner_id"] and user_id not in document["collaborators"]:
        await sio.emit("error", {"error": "Permission denied"}, room=sid)
        return
    await sio.enter_room(sid, doc_id)
    active_sessions[sid]["doc_id"] = doc_id
    await sio.emit("user_joined", {"user_id": user_id, "doc_id": doc_id}, room=doc_id)


@sio.event
async def text_change(sid, data):
    session = active_sessions.get(sid)
    if not session:
        return
    user_id = session["user_id"]
    doc_id = data.get("doc_id")
    document = documents.get(doc_id)
    if not document:
        await sio.emit("error", {"error": "Document not found"}, room=sid)
        return
    if user_id != document["owner_id"] and user_id not in document["collaborators"]:
        await sio.emit("error", {"error": "Permission denied"}, room=sid)
        return
    delta = data.get("delta")
    cursor_position = data.get("cursor_position")
    if delta is None:
        return
    document["content"] = delta
    snapshot = save_snapshot_if_needed(doc_id, document["content"], user_id)
    payload = {
        "doc_id": doc_id,
        "content": document["content"],
        "cursor_position": cursor_position,
        "user_id": user_id,
    }
    await sio.emit("text_update", payload, room=doc_id, skip_sid=sid)
    if snapshot:
        await sio.emit("snapshot_saved", snapshot, room=doc_id)


@sio.event
async def cursor_move(sid, data):
    session = active_sessions.get(sid)
    if not session:
        return
    user_id = session["user_id"]
    doc_id = data.get("doc_id")
    cursor_position = data.get("cursor_position")
    username = get_user(user_id)["username"]
    await sio.emit(
        "cursor_moved",
        {"doc_id": doc_id, "cursor_position": cursor_position, "username": username},
        room=doc_id,
        skip_sid=sid,
    )


@sio.event
async def save_snapshot(sid, data):
    session = active_sessions.get(sid)
    if not session:
        return
    doc_id = data.get("doc_id")
    user_id = session["user_id"]
    document = documents.get(doc_id)
    if not document:
        await sio.emit("error", {"error": "Document not found"}, room=sid)
        return
    snapshot_id = f"snapshot-{len(get_history(doc_id)) + 1}"
    snapshot = add_snapshot(doc_id, snapshot_id, document["content"], user_id)
    await sio.emit("snapshot_saved", snapshot, room=doc_id)


@sio.event
async def disconnect(sid):
    session = active_sessions.pop(sid, None)
    if not session:
        return
    doc_id = session.get("doc_id")
    if doc_id:
        await sio.emit("user_left", {"user_id": session["user_id"], "doc_id": doc_id}, room=doc_id)
