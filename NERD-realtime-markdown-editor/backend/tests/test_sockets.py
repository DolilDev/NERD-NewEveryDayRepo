"""Async tests for the Socket.IO event handlers.

The handler logic is exercised directly with a mocked ``AsyncServer`` (an
``AsyncMock``), so no real network or event loop plumbing is required beyond
pytest-asyncio. Covers join, document update broadcast, and reconnect.
"""

from unittest.mock import AsyncMock

import socketio

from app.session import SessionManager
from app.sockets import (
    DEFAULT_NAME,
    handle_disconnect,
    handle_doc_update,
    handle_join,
    register_handlers,
)


def make_server() -> AsyncMock:
    """A stand-in AsyncServer whose async methods record calls."""
    return AsyncMock()


async def test_join_adds_user_and_sends_current_content():
    sio = make_server()
    session = SessionManager()
    session.set_content("main", "# Existing")

    await handle_join(sio, session, "sidA", {"room": "main", "name": "Ada"})

    assert session.get_users("main") == ["Ada"]
    sio.enter_room.assert_awaited_once_with("sidA", "main")
    sio.emit.assert_awaited_once_with("doc:sync", {"content": "# Existing"}, to="sidA")


async def test_join_defaults_room_and_name():
    sio = make_server()
    session = SessionManager()

    await handle_join(sio, session, "sidA", None)

    assert session.room_of("sidA") == session.default_room
    assert session.get_users(session.default_room) == [DEFAULT_NAME]


async def test_doc_update_stores_and_broadcasts_skipping_sender():
    sio = make_server()
    session = SessionManager()
    await handle_join(sio, session, "sender", {"room": "main", "name": "Ada"})
    sio.reset_mock()

    await handle_doc_update(sio, session, "sender", {"room": "main", "content": "# New"})

    assert session.get_content("main") == "# New"
    sio.emit.assert_awaited_once_with(
        "doc:sync", {"content": "# New"}, room="main", skip_sid="sender"
    )


async def test_doc_update_ignores_malformed_payload():
    sio = make_server()
    session = SessionManager()
    session.set_content("main", "original")
    await handle_join(sio, session, "sender", {"room": "main", "name": "Ada"})
    sio.reset_mock()

    await handle_doc_update(sio, session, "sender", {"room": "main"})  # no content
    await handle_doc_update(sio, session, "sender", "not-a-dict")

    sio.emit.assert_not_awaited()
    assert session.get_content("main") == "original"


async def test_doc_update_falls_back_to_sender_room():
    sio = make_server()
    session = SessionManager()
    await handle_join(sio, session, "sender", {"room": "main", "name": "Ada"})
    sio.reset_mock()

    await handle_doc_update(sio, session, "sender", {"content": "X"})  # no room

    sio.emit.assert_awaited_once_with(
        "doc:sync", {"content": "X"}, room="main", skip_sid="sender"
    )


async def test_disconnect_keeps_content_and_returns_record():
    sio = make_server()
    session = SessionManager()
    await handle_join(sio, session, "sidA", {"room": "main", "name": "Ada"})
    session.set_content("main", "# Draft")

    removed = await handle_disconnect(sio, session, "sidA")

    assert removed is not None and removed.name == "Ada" and removed.room == "main"
    assert session.has_room("main")
    assert session.get_content("main") == "# Draft"
    assert session.get_users("main") == []


async def test_disconnect_prunes_empty_non_default_room():
    sio = make_server()
    session = SessionManager()
    await handle_join(sio, session, "sidB", {"room": "scratch", "name": "Bo"})
    assert session.has_room("scratch")

    await handle_disconnect(sio, session, "sidB")

    assert not session.has_room("scratch")


async def test_update_then_reconnect_receives_latest_content():
    """Edit -> disconnect -> reconnect: the new connection gets the latest."""
    sio = make_server()
    session = SessionManager()

    await handle_join(sio, session, "old", {"room": "main", "name": "Ada"})
    await handle_doc_update(sio, session, "old", {"room": "main", "content": "v2"})
    await handle_disconnect(sio, session, "old")

    sio.reset_mock()
    await handle_join(sio, session, "new", {"room": "main", "name": "Ada"})

    sio.emit.assert_awaited_once_with("doc:sync", {"content": "v2"}, to="new")


def test_register_handlers_binds_events():
    sio = socketio.AsyncServer(async_mode="asgi")
    register_handlers(sio, SessionManager())
    bound = sio.handlers["/"]
    for event in ("connect", "disconnect", "join", "doc:update"):
        assert event in bound
