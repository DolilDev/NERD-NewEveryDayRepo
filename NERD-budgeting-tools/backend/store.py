"""Thread-safe JSON-file persistence layer.

All application data lives in three JSON files inside ``data_dir``:

- ``users.json``        — ``[{id, username, password_hash}]``
- ``transactions.json`` — ``[{id, user_id, type, amount, category, date, description}]``
- ``budgets.json``      — ``[{user_id, category, limit}]``

Every public method takes the lock and reads/writes the relevant file. Writes
are **atomic**: data is dumped to a temp file then ``os.replace``d over the
target, so a crash mid-write can never corrupt the store. Query helpers always
take a ``user_id`` and only return rows owned by that user — this is what
enforces per-user isolation.
"""

import json
import os
import threading


class JSONStore:
    """Persistence backed by three JSON files in ``data_dir``."""

    def __init__(self, data_dir):
        self.data_dir = data_dir
        # Re-entrant so a method could call another without deadlocking.
        self._lock = threading.RLock()
        os.makedirs(data_dir, exist_ok=True)

    # ---- low-level file helpers -------------------------------------------
    def _path(self, name):
        return os.path.join(self.data_dir, f"{name}.json")

    def _read(self, name):
        path = self._path(name)
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as fh:
            try:
                return json.load(fh)
            except json.JSONDecodeError:
                # Corrupt/empty file — treat as no data rather than crashing.
                return []

    def _write(self, name, data):
        path = self._path(name)
        tmp = f"{path}.tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
        os.replace(tmp, path)

    @staticmethod
    def _next_id(rows):
        return max((row["id"] for row in rows), default=0) + 1

    # ---- users ------------------------------------------------------------
    def create_user(self, username, password_hash):
        with self._lock:
            users = self._read("users")
            user = {
                "id": self._next_id(users),
                "username": username,
                "password_hash": password_hash,
            }
            users.append(user)
            self._write("users", users)
            return dict(user)

    def get_user_by_username(self, username):
        with self._lock:
            for user in self._read("users"):
                if user["username"] == username:
                    return dict(user)
        return None

    def get_user_by_id(self, user_id):
        with self._lock:
            for user in self._read("users"):
                if user["id"] == user_id:
                    return dict(user)
        return None

    # ---- transactions -----------------------------------------------------
    def list_transactions(self, user_id, start=None, end=None, category=None):
        """Return the user's transactions (newest first) with optional filters."""
        with self._lock:
            rows = [
                dict(t)
                for t in self._read("transactions")
                if t["user_id"] == user_id
            ]
        if start:
            rows = [t for t in rows if t["date"] >= start]
        if end:
            rows = [t for t in rows if t["date"] <= end]
        if category:
            rows = [t for t in rows if t["category"] == category]
        rows.sort(key=lambda t: (t["date"], t["id"]), reverse=True)
        return rows

    def get_transaction(self, user_id, tx_id):
        with self._lock:
            for t in self._read("transactions"):
                if t["id"] == tx_id and t["user_id"] == user_id:
                    return dict(t)
        return None

    def create_transaction(self, user_id, data):
        with self._lock:
            rows = self._read("transactions")
            tx = {"id": self._next_id(rows), "user_id": user_id, **data}
            rows.append(tx)
            self._write("transactions", rows)
            return dict(tx)

    def update_transaction(self, user_id, tx_id, data):
        with self._lock:
            rows = self._read("transactions")
            for t in rows:
                if t["id"] == tx_id and t["user_id"] == user_id:
                    t.update(data)
                    self._write("transactions", rows)
                    return dict(t)
        return None

    def delete_transaction(self, user_id, tx_id):
        with self._lock:
            rows = self._read("transactions")
            for index, t in enumerate(rows):
                if t["id"] == tx_id and t["user_id"] == user_id:
                    del rows[index]
                    self._write("transactions", rows)
                    return True
        return False

    # ---- budgets ----------------------------------------------------------
    def get_budgets(self, user_id):
        with self._lock:
            return [
                dict(b)
                for b in self._read("budgets")
                if b["user_id"] == user_id
            ]

    def set_budget(self, user_id, category, limit):
        """Create or update (upsert) the budget for ``category``."""
        with self._lock:
            rows = self._read("budgets")
            for b in rows:
                if b["user_id"] == user_id and b["category"] == category:
                    b["limit"] = limit
                    self._write("budgets", rows)
                    return dict(b)
            budget = {"user_id": user_id, "category": category, "limit": limit}
            rows.append(budget)
            self._write("budgets", rows)
            return dict(budget)

    def delete_budget(self, user_id, category):
        with self._lock:
            rows = self._read("budgets")
            for index, b in enumerate(rows):
                if b["user_id"] == user_id and b["category"] == category:
                    del rows[index]
                    self._write("budgets", rows)
                    return True
        return False
