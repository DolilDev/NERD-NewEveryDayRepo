"""Tests for transaction CRUD, summary, validation, isolation and CSV export."""


def _make_tx(client, **overrides):
    payload = {
        "amount": 25.5,
        "type": "expense",
        "category": "food",
        "date": "2026-06-01",
        "description": "lunch",
    }
    payload.update(overrides)
    return client.post("/api/transactions", json=payload)


def test_create_and_list(auth_client):
    r = _make_tx(auth_client)
    assert r.status_code == 201
    tx = r.get_json()
    assert tx["id"] == 1
    assert tx["amount"] == 25.5

    r = auth_client.get("/api/transactions")
    assert r.status_code == 200
    assert len(r.get_json()) == 1


def test_validation_errors(auth_client):
    assert _make_tx(auth_client, amount="nan").status_code == 400
    assert _make_tx(auth_client, amount=-5).status_code == 400
    assert _make_tx(auth_client, amount=0).status_code == 400
    assert _make_tx(auth_client, type="bogus").status_code == 400
    assert _make_tx(auth_client, category="   ").status_code == 400
    assert _make_tx(auth_client, date="2026/06/01").status_code == 400


def test_get_update_delete(auth_client):
    tx_id = _make_tx(auth_client).get_json()["id"]
    assert auth_client.get(f"/api/transactions/{tx_id}").status_code == 200

    r = auth_client.put(
        f"/api/transactions/{tx_id}",
        json={
            "amount": 99,
            "type": "income",
            "category": "salary",
            "date": "2026-06-02",
        },
    )
    assert r.status_code == 200
    assert r.get_json()["type"] == "income"

    assert auth_client.delete(f"/api/transactions/{tx_id}").status_code == 200
    assert auth_client.get(f"/api/transactions/{tx_id}").status_code == 404


def test_missing_transaction_returns_404(auth_client):
    assert auth_client.get("/api/transactions/999").status_code == 404
    assert auth_client.delete("/api/transactions/999").status_code == 404
    assert (
        auth_client.put(
            "/api/transactions/999",
            json={
                "amount": 1,
                "type": "income",
                "category": "x",
                "date": "2026-01-01",
            },
        ).status_code
        == 404
    )


def test_user_isolation(make_user_client):
    alice = make_user_client("alice")
    bob = make_user_client("bob")
    tx_id = _make_tx(alice).get_json()["id"]

    assert bob.get(f"/api/transactions/{tx_id}").status_code == 404
    assert bob.delete(f"/api/transactions/{tx_id}").status_code == 404
    assert bob.get("/api/transactions").get_json() == []


def test_summary(auth_client):
    _make_tx(auth_client, amount=100, type="income", category="salary")
    _make_tx(auth_client, amount=30, type="expense", category="food")
    data = auth_client.get("/api/summary").get_json()
    assert data["total_income"] == 100
    assert data["total_expenses"] == 30
    assert data["balance"] == 70


def test_filters(auth_client):
    _make_tx(auth_client, date="2026-01-01", category="food")
    _make_tx(auth_client, date="2026-06-01", category="rent")
    assert len(auth_client.get("/api/transactions?category=food").get_json()) == 1
    assert (
        len(auth_client.get("/api/transactions?start=2026-05-01").get_json()) == 1
    )
    assert auth_client.get("/api/transactions?start=bad").status_code == 400


def test_csv_export(auth_client):
    _make_tx(auth_client, amount=12, category="food", description="snack")
    r = auth_client.get("/api/transactions/export.csv")
    assert r.status_code == 200
    assert r.mimetype == "text/csv"
    body = r.get_data(as_text=True)
    assert "id,date,type,category,amount,description" in body
    assert "food" in body
    assert "snack" in body
