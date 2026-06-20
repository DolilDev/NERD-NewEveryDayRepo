"""Socket.IO event handlers for the collaborative editor.

The handler *logic* lives in plain ``async`` functions that take the server and
the :class:`SessionManager` explicitly, so they can be unit-tested with a mock
server and no real network. :func:`register_handlers` wires them onto an
``AsyncServer`` instance.

Protocol
--------
Client -> server:
    ``join``        ``{"room": str, "name": str}``  — join a room.
    ``doc:update``  ``{"room": str, "content": str}`` — push an edit (step 7).

Server -> client:
    ``doc:sync``    ``{"content": str}`` — current/updated document content.
"""

from __future__ import annotations

import socketio

from .session import RemovedUser, SessionManager

DEFAULT_NAME = "Anonymous"


def _clean_name(raw: object) -> str:
    """Normalise an incoming display name, falling back to a default."""
    if not isinstance(raw, str):
        return DEFAULT_NAME
    return raw.strip() or DEFAULT_NAME


async def handle_join(
    sio: socketio.AsyncServer, session: SessionManager, sid: str, data: object
) -> None:
    """Assign a connection to a room and send it the current content."""
    payload = data if isinstance(data, dict) else {}
    room = payload.get("room") or session.default_room
    name = _clean_name(payload.get("name"))

    session.add_user(room, sid, name)
    await sio.enter_room(sid, room)

    # The newly joined (or reconnecting) client receives the latest content.
    await sio.emit("doc:sync", {"content": session.get_content(room)}, to=sid)


async def handle_doc_update(
    sio: socketio.AsyncServer, session: SessionManager, sid: str, data: object
) -> None:
    """Store an incoming edit and broadcast it to the room's other clients.

    Last-write-wins: the room content is overwritten with ``content``. The
    update is broadcast as ``doc:sync`` to everyone in the room except the
    sender. Malformed payloads (missing/non-string content) are ignored.
    """
    payload = data if isinstance(data, dict) else {}
    content = payload.get("content")
    if not isinstance(content, str):
        return  # ignore malformed input

    room = payload.get("room") or session.room_of(sid) or session.default_room
    session.set_content(room, content)
    await sio.emit("doc:sync", {"content": content}, room=room, skip_sid=sid)


async def handle_disconnect(
    sio: socketio.AsyncServer, session: SessionManager, sid: str
) -> RemovedUser | None:
    """Remove the connection from its room without discarding the document.

    The room's content is preserved so a reconnecting client receives the
    latest content on its next ``join``. Empty *non-default* rooms are then
    reclaimed safely — the default (shared) room is always kept, so its
    content survives even when nobody is connected. Returns the removed user.
    """
    removed = session.remove_user(sid)
    # Free memory for abandoned ad-hoc rooms; never touches the default room.
    session.prune_empty_rooms()
    return removed


def register_handlers(sio: socketio.AsyncServer, session: SessionManager) -> None:
    """Bind the handlers above to ``sio``."""

    @sio.event
    async def connect(sid: str, environ: dict, auth: object = None) -> None:
        # Accept all connections; the client must emit ``join`` to participate.
        return None

    @sio.event
    async def disconnect(sid: str) -> None:
        await handle_disconnect(sio, session, sid)

    @sio.on("join")
    async def join(sid: str, data: object) -> None:
        await handle_join(sio, session, sid, data)

    @sio.on("doc:update")
    async def doc_update(sid: str, data: object) -> None:
        await handle_doc_update(sio, session, sid, data)
