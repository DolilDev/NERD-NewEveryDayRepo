"""In-memory session state for collaborative documents.

A *room* is one shared document. The :class:`SessionManager` owns all room
state — document content plus the set of connected users — and is deliberately
free of any Socket.IO / network dependency so it can be unit-tested in
isolation.

Concurrency model is last-write-wins: :meth:`SessionManager.set_content`
overwrites the stored content wholesale. This is intentional (see the README).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Room:
    """State for a single shared document."""

    content: str = ""
    # sid -> display name of every currently-connected user in this room.
    users: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class RemovedUser:
    """Result of removing a user: which room they were in and their name."""

    room: str
    name: str


class SessionManager:
    """Owns per-room document state and connected users.

    The default room is created up front so a fresh client can join it
    immediately. Rooms are created lazily on first use otherwise.
    """

    def __init__(self, default_room: str = "main") -> None:
        self.default_room = default_room
        self._rooms: dict[str, Room] = {}
        self._sid_room: dict[str, str] = {}
        self.ensure_room(default_room)

    # -- room lifecycle ----------------------------------------------------
    def ensure_room(self, room: str) -> Room:
        """Return the room, creating it (empty) if it does not exist yet."""
        existing = self._rooms.get(room)
        if existing is None:
            existing = Room()
            self._rooms[room] = existing
        return existing

    def has_room(self, room: str) -> bool:
        return room in self._rooms

    def list_rooms(self) -> list[str]:
        return list(self._rooms)

    # -- document content --------------------------------------------------
    def get_content(self, room: str) -> str:
        """Current content of ``room`` (creates the room empty if missing)."""
        return self.ensure_room(room).content

    def set_content(self, room: str, content: str) -> None:
        """Overwrite ``room``'s content (last-write-wins)."""
        self.ensure_room(room).content = content

    # -- users -------------------------------------------------------------
    def add_user(self, room: str, sid: str, name: str) -> None:
        """Attach a connection (``sid``) with ``name`` to ``room``.

        If the sid was already in another room, it is moved.
        """
        previous = self._sid_room.get(sid)
        if previous is not None and previous != room:
            prev_room = self._rooms.get(previous)
            if prev_room is not None:
                prev_room.users.pop(sid, None)
        self.ensure_room(room).users[sid] = name
        self._sid_room[sid] = room

    def remove_user(self, sid: str) -> RemovedUser | None:
        """Remove a connection. Keeps the room's content intact.

        Returns the room/name that was removed, or ``None`` if the sid was
        unknown. Safe to call for an already-removed sid.
        """
        room = self._sid_room.pop(sid, None)
        if room is None:
            return None
        existing = self._rooms.get(room)
        name = existing.users.pop(sid, None) if existing is not None else None
        return RemovedUser(room=room, name=name if name is not None else "")

    def room_of(self, sid: str) -> str | None:
        return self._sid_room.get(sid)

    def get_users(self, room: str) -> list[str]:
        """Display names of users currently in ``room`` (insertion order)."""
        existing = self._rooms.get(room)
        if existing is None:
            return []
        return list(existing.users.values())

    def user_count(self, room: str) -> int:
        existing = self._rooms.get(room)
        return len(existing.users) if existing is not None else 0

    # -- maintenance -------------------------------------------------------
    def prune_empty_rooms(self) -> list[str]:
        """Drop empty rooms to free memory — never the default room.

        Document content is preserved for the default room (and for any room
        that still has users), so reconnecting clients keep their state. Only
        genuinely empty, non-default rooms are removed. Returns removed names.
        """
        removed: list[str] = []
        for name in list(self._rooms):
            if name == self.default_room:
                continue
            if not self._rooms[name].users:
                del self._rooms[name]
                removed.append(name)
        return removed
