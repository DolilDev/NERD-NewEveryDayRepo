"""Unit tests for the pure SessionManager state container."""

from app.session import RemovedUser, SessionManager


def test_default_room_created_empty():
    m = SessionManager()
    assert m.has_room("main")
    assert m.get_content("main") == ""
    assert m.get_users("main") == []


def test_custom_default_room():
    m = SessionManager(default_room="lobby")
    assert m.default_room == "lobby"
    assert m.has_room("lobby")


def test_set_and_get_content():
    m = SessionManager()
    m.set_content("main", "# Hello")
    assert m.get_content("main") == "# Hello"


def test_rooms_created_lazily():
    m = SessionManager()
    assert not m.has_room("alpha")
    m.set_content("alpha", "x")
    assert m.has_room("alpha")
    assert m.get_content("alpha") == "x"


def test_add_users_preserves_order():
    m = SessionManager()
    m.add_user("main", "s1", "Ada")
    m.add_user("main", "s2", "Lin")
    assert m.get_users("main") == ["Ada", "Lin"]
    assert m.user_count("main") == 2
    assert m.room_of("s1") == "main"


def test_remove_user_returns_record_and_keeps_content():
    m = SessionManager()
    m.add_user("main", "s1", "Ada")
    m.set_content("main", "# Draft")
    removed = m.remove_user("s1")
    assert removed == RemovedUser(room="main", name="Ada")
    # content survives the disconnect
    assert m.get_content("main") == "# Draft"
    assert m.get_users("main") == []


def test_remove_unknown_user_is_safe():
    m = SessionManager()
    assert m.remove_user("ghost") is None


def test_add_user_moves_between_rooms():
    m = SessionManager()
    m.add_user("main", "s1", "Ada")
    m.add_user("alpha", "s1", "Ada")
    assert m.get_users("main") == []
    assert m.get_users("alpha") == ["Ada"]
    assert m.room_of("s1") == "alpha"


def test_prune_removes_empty_non_default_rooms_only():
    m = SessionManager()
    m.add_user("alpha", "s1", "Ada")
    m.add_user("beta", "s2", "Lin")
    m.set_content("main", "keep me")
    # empty the default room and alpha; beta still occupied
    m.remove_user("s1")
    removed = m.prune_empty_rooms()
    assert removed == ["alpha"]
    assert m.has_room("main")  # default kept even though empty
    assert m.get_content("main") == "keep me"
    assert m.has_room("beta")  # occupied room kept
    assert not m.has_room("alpha")
