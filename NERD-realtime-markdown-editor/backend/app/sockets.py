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

from .session import SessionManager

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


async def handle_disconnect(
    sio: socketio.AsyncServer, session: SessionManager, sid: str
) -> None:
    """Remove the connection from its room (room content is preserved)."""
    session.remove_user(sid)


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
