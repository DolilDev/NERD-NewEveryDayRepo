"""Tests for the authentication endpoints."""


def test_register_login_me_logout(client):
    r = client.post(
        "/api/register", json={"username": "neo", "password": "matrix"}
    )
    assert r.status_code == 201
    assert r.get_json()["username"] == "neo"

    assert (
        client.post(
            "/api/login", json={"username": "neo", "password": "matrix"}
        ).status_code
        == 200
    )

    r = client.get("/api/me")
    assert r.status_code == 200
    assert r.get_json()["username"] == "neo"

    assert client.post("/api/logout").status_code == 200
    assert client.get("/api/me").status_code == 401


def test_register_requires_fields(client):
    assert (
        client.post(
            "/api/register", json={"username": "", "password": "secret"}
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/register", json={"username": "a", "password": ""}
        ).status_code
        == 400
    )


def test_register_rejects_short_password(client):
    assert (
        client.post(
            "/api/register", json={"username": "a", "password": "xy"}
        ).status_code
        == 400
    )


def test_duplicate_username_rejected(client):
    client.post("/api/register", json={"username": "dup", "password": "secret"})
    r = client.post(
        "/api/register", json={"username": "dup", "password": "secret"}
    )
    assert r.status_code == 400


def test_login_bad_credentials(client):
    client.post("/api/register", json={"username": "x", "password": "secret"})
    assert (
        client.post(
            "/api/login", json={"username": "x", "password": "wrong"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/login", json={"username": "ghost", "password": "secret"}
        ).status_code
        == 401
    )


def test_protected_endpoints_require_auth(client):
    assert client.get("/api/transactions").status_code == 401
    assert client.get("/api/summary").status_code == 401
    assert client.get("/api/budgets").status_code == 401
