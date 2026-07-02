"""Tests for the authentication endpoints."""


def test_register_success(client):
    res = client.post(
        "/api/register", json={"username": "alice", "password": "secret"}
    )
    assert res.status_code == 201
    assert res.get_json()["username"] == "alice"
    # Password must never be echoed back.
    assert "password" not in res.get_json()
    assert "password_hash" not in res.get_json()


def test_register_duplicate_username(client):
    client.post("/api/register", json={"username": "bob", "password": "secret"})
    res = client.post(
        "/api/register", json={"username": "bob", "password": "other"}
    )
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_register_missing_fields(client):
    res = client.post("/api/register", json={"username": "no_password"})
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_register_empty_body(client):
    res = client.post("/api/register", json={})
    assert res.status_code == 400


def test_login_success(client):
    client.post(
        "/api/register", json={"username": "carol", "password": "secret"}
    )
    res = client.post(
        "/api/login", json={"username": "carol", "password": "secret"}
    )
    assert res.status_code == 200
    assert res.get_json()["username"] == "carol"


def test_login_wrong_password(client):
    client.post("/api/register", json={"username": "dave", "password": "secret"})
    res = client.post(
        "/api/login", json={"username": "dave", "password": "wrong"}
    )
    assert res.status_code == 401
    assert res.get_json()["error"] == "Invalid credentials"


def test_login_unknown_user(client):
    res = client.post(
        "/api/login", json={"username": "ghost", "password": "secret"}
    )
    assert res.status_code == 401


def test_protected_endpoint_requires_login(client):
    # /api/me is protected — without a session it must return JSON 401.
    res = client.get("/api/me")
    assert res.status_code == 401
    assert res.is_json
    assert "error" in res.get_json()


def test_me_returns_current_user(auth_client):
    res = auth_client.get("/api/me")
    assert res.status_code == 200
    assert res.get_json()["username"] == "tester"


def test_logout(auth_client):
    assert auth_client.post("/api/logout").status_code == 200
    # After logout the session is gone.
    assert auth_client.get("/api/me").status_code == 401
