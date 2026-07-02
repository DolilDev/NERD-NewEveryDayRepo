"""Unit tests for the JSON storage layer (no Flask involved)."""

from backend.store import JSONStore


def test_create_and_fetch_user(tmp_path):
    store = JSONStore(str(tmp_path))
    user = store.create_user("alice", "hash1")
    assert user["id"] == 1
    assert store.get_user_by_username("alice")["username"] == "alice"
    assert store.get_user_by_id(1)["id"] == 1
    assert store.get_user_by_username("bob") is None


def test_transaction_crud_and_isolation(tmp_path):
    store = JSONStore(str(tmp_path))
    alice = store.create_user("a", "h")["id"]
    bob = store.create_user("b", "h")["id"]

    tx = store.create_transaction(
        alice,
        {
            "amount": 10.0,
            "type": "expense",
            "category": "food",
            "date": "2026-06-01",
            "description": None,
        },
    )
    assert tx["id"] == 1

    # Bob cannot see or mutate Alice's transaction.
    assert store.get_transaction(bob, tx["id"]) is None
    assert store.list_transactions(bob) == []
    assert store.update_transaction(bob, tx["id"], {"amount": 99}) is None
    assert store.delete_transaction(bob, tx["id"]) is False

    updated = store.update_transaction(alice, tx["id"], {"amount": 12.5})
    assert updated["amount"] == 12.5
    assert store.delete_transaction(alice, tx["id"]) is True
    assert store.list_transactions(alice) == []


def test_list_transactions_filters_and_order(tmp_path):
    store = JSONStore(str(tmp_path))
    uid = store.create_user("u", "h")["id"]
    for date, category in [
        ("2026-01-05", "food"),
        ("2026-03-10", "rent"),
        ("2026-02-01", "food"),
    ]:
        store.create_transaction(
            uid,
            {
                "amount": 5,
                "type": "expense",
                "category": category,
                "date": date,
                "description": None,
            },
        )

    rows = store.list_transactions(uid)
    assert [r["date"] for r in rows] == [
        "2026-03-10",
        "2026-02-01",
        "2026-01-05",
    ]
    assert len(store.list_transactions(uid, category="food")) == 2
    assert len(store.list_transactions(uid, start="2026-02-01")) == 2
    assert len(store.list_transactions(uid, end="2026-02-01")) == 2


def test_budget_upsert_and_delete(tmp_path):
    store = JSONStore(str(tmp_path))
    uid = store.create_user("u", "h")["id"]
    store.set_budget(uid, "food", 100.0)
    store.set_budget(uid, "food", 150.0)  # upsert, not a duplicate

    budgets = store.get_budgets(uid)
    assert len(budgets) == 1
    assert budgets[0]["limit"] == 150.0

    assert store.delete_budget(uid, "food") is True
    assert store.get_budgets(uid) == []
    assert store.delete_budget(uid, "food") is False


def test_data_persists_across_instances(tmp_path):
    store = JSONStore(str(tmp_path))
    store.create_user("persist", "h")
    # A new store over the same directory sees the previously written data.
    store2 = JSONStore(str(tmp_path))
    assert store2.get_user_by_username("persist") is not None
