"""Tests for the transactions CRUD endpoints, summary and user isolation."""


def make_transaction(client, **overrides):
    """POST a transaction with sensible defaults, returning the response."""
    payload = {
        "amount": 100,
        "type": "income",
        "category": "salary",
        "date": "2026-06-01",
    }
    payload.update(overrides)
    return client.post("/api/transactions", json=payload)


# ---------- Create ----------
def test_create_transaction_success(auth_client):
    res = make_transaction(auth_client, amount=42.50, category="bonus")
    assert res.status_code == 201
    body = res.get_json()
    assert body["amount"] == 42.50
    assert body["category"] == "bonus"
    assert body["type"] == "income"
    assert "id" in body


def test_create_requires_login(client):
    res = make_transaction(client)
    assert res.status_code == 401


def test_create_rejects_non_positive_amount(auth_client):
    res = make_transaction(auth_client, amount=-5)
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_create_rejects_invalid_type(auth_client):
    res = make_transaction(auth_client, type="transfer")
    assert res.status_code == 400


def test_create_rejects_missing_category(auth_client):
    res = make_transaction(auth_client, category="")
    assert res.status_code == 400


def test_create_rejects_bad_date(auth_client):
    res = make_transaction(auth_client, date="not-a-date")
    assert res.status_code == 400


# ---------- Read ----------
def test_list_returns_only_own_transactions(auth_client):
    make_transaction(auth_client, category="a")
    make_transaction(auth_client, category="b")
    res = auth_client.get("/api/transactions")
    assert res.status_code == 200
    assert len(res.get_json()) == 2


def test_get_single_transaction(auth_client):
    created = make_transaction(auth_client).get_json()
    res = auth_client.get(f"/api/transactions/{created['id']}")
    assert res.status_code == 200
    assert res.get_json()["id"] == created["id"]


def test_get_missing_transaction_returns_404(auth_client):
    assert auth_client.get("/api/transactions/9999").status_code == 404


# ---------- Update ----------
def test_update_transaction(auth_client):
    created = make_transaction(auth_client, amount=10).get_json()
    res = auth_client.put(
        f"/api/transactions/{created['id']}",
        json={
            "amount": 99,
            "type": "expense",
            "category": "rent",
            "date": "2026-06-10",
        },
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["amount"] == 99
    assert body["type"] == "expense"
    assert body["category"] == "rent"


def test_update_validates_input(auth_client):
    created = make_transaction(auth_client).get_json()
    res = auth_client.put(
        f"/api/transactions/{created['id']}",
        json={"amount": 0, "type": "income", "category": "x", "date": "2026-06-10"},
    )
    assert res.status_code == 400


# ---------- Delete ----------
def test_delete_transaction(auth_client):
    created = make_transaction(auth_client).get_json()
    assert auth_client.delete(f"/api/transactions/{created['id']}").status_code == 200
    # It is really gone.
    assert auth_client.get(f"/api/transactions/{created['id']}").status_code == 404


# ---------- User isolation (the important one) ----------
def test_user_cannot_access_another_users_transaction(make_user_client):
    """User A's transaction must be invisible/unreachable to user B."""
    client_a = make_user_client("user_a")
    client_b = make_user_client("user_b")

    tx_id = make_transaction(client_a, category="private").get_json()["id"]

    # B's list does not include A's transaction.
    assert make_transaction(client_b, category="b_tx").status_code == 201
    b_list = client_b.get("/api/transactions").get_json()
    assert all(t["category"] != "private" for t in b_list)
    assert len(b_list) == 1

    # B cannot read, update or delete A's transaction — all return 404.
    assert client_b.get(f"/api/transactions/{tx_id}").status_code == 404
    assert client_b.put(
        f"/api/transactions/{tx_id}",
        json={"amount": 1, "type": "income", "category": "x", "date": "2026-06-01"},
    ).status_code == 404
    assert client_b.delete(f"/api/transactions/{tx_id}").status_code == 404

    # A's transaction is still intact.
    assert client_a.get(f"/api/transactions/{tx_id}").status_code == 200


# ---------- Summary ----------
def test_summary_calculates_totals(auth_client):
    make_transaction(auth_client, amount=1000, type="income", date="2026-06-01")
    make_transaction(auth_client, amount=200, type="expense", date="2026-06-02")
    make_transaction(auth_client, amount=50, type="expense", date="2026-06-03")

    summary = auth_client.get("/api/summary").get_json()
    assert summary["total_income"] == 1000
    assert summary["total_expenses"] == 250
    assert summary["balance"] == 750


def test_summary_respects_date_filter(auth_client):
    make_transaction(auth_client, amount=500, type="income", date="2026-05-15")
    make_transaction(auth_client, amount=300, type="income", date="2026-06-15")

    summary = auth_client.get(
        "/api/summary?start=2026-06-01&end=2026-06-30"
    ).get_json()
    assert summary["total_income"] == 300


def test_summary_is_per_user(make_user_client):
    client_a = make_user_client("alice2")
    client_b = make_user_client("bob2")
    make_transaction(client_a, amount=1000, type="income")
    # B has no transactions, so every total is zero.
    summary = client_b.get("/api/summary").get_json()
    assert summary["total_income"] == 0
    assert summary["total_expenses"] == 0
    assert summary["balance"] == 0
