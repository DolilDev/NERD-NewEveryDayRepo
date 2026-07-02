"""Tests for the budgets endpoints."""


def test_set_list_update_delete_budget(auth_client):
    assert (
        auth_client.put(
            "/api/budgets", json={"category": "food", "limit": 200}
        ).status_code
        == 200
    )

    # Upsert: the same category updates rather than duplicating.
    auth_client.put("/api/budgets", json={"category": "food", "limit": 250})
    budgets = auth_client.get("/api/budgets").get_json()
    assert len(budgets) == 1
    assert budgets[0]["limit"] == 250

    assert auth_client.delete("/api/budgets/food").status_code == 200
    assert auth_client.get("/api/budgets").get_json() == []


def test_budget_spent_computation(auth_client):
    auth_client.put("/api/budgets", json={"category": "food", "limit": 100})
    auth_client.post(
        "/api/transactions",
        json={
            "amount": 30,
            "type": "expense",
            "category": "food",
            "date": "2026-06-01",
        },
    )
    auth_client.post(
        "/api/transactions",
        json={
            "amount": 10,
            "type": "expense",
            "category": "food",
            "date": "2026-06-02",
        },
    )
    # Income in the same category must NOT count against the budget.
    auth_client.post(
        "/api/transactions",
        json={
            "amount": 500,
            "type": "income",
            "category": "food",
            "date": "2026-06-03",
        },
    )

    budget = auth_client.get("/api/budgets").get_json()[0]
    assert budget["spent"] == 40
    assert budget["remaining"] == 60


def test_budget_validation(auth_client):
    assert (
        auth_client.put(
            "/api/budgets", json={"category": "", "limit": 10}
        ).status_code
        == 400
    )
    assert (
        auth_client.put(
            "/api/budgets", json={"category": "x", "limit": "nan"}
        ).status_code
        == 400
    )
    assert (
        auth_client.put(
            "/api/budgets", json={"category": "x", "limit": -5}
        ).status_code
        == 400
    )


def test_delete_missing_budget_returns_404(auth_client):
    assert auth_client.delete("/api/budgets/ghost").status_code == 404


def test_budgets_are_user_scoped(make_user_client):
    alice = make_user_client("alice")
    bob = make_user_client("bob")
    alice.put("/api/budgets", json={"category": "food", "limit": 100})
    assert bob.get("/api/budgets").get_json() == []
