# Personal Finance Tracker

A small full-stack web application for tracking personal income and expenses.
Users can register, log in, record transactions, filter them by date and
category, see a live summary of their finances, and visualise their money over
time with interactive charts.

Everything runs from a **single Flask process on one port** — the backend
serves the static frontend, so there is no CORS to configure and the session
cookie "just works".

---

## Features

- 🔐 **User accounts** — registration and login with hashed passwords
  (Flask-Login sessions, `werkzeug` password hashing — passwords are never
  stored in plaintext).
- 💸 **Transactions CRUD** — create, read, update and delete income/expense
  entries through a REST API.
- 🔒 **Strict per-user isolation** — every query is scoped to the logged-in
  user; trying to reach someone else's transaction returns `404`.
- 📊 **Summary** — total income, total expenses and balance, recalculated live.
- 🔎 **Filtering** — filter the list and the summary by date range and category.
- 📈 **Charts (the twist)** — three Chart.js visualisations: cumulative balance
  over time, expenses by category, and monthly income vs expenses.
- ✅ **Validation & error handling** — both client-side (before submit) and
  server-side, with clean JSON error responses (never HTML error pages).
- 🧪 **Tested** — a pytest suite covering auth, CRUD, the summary maths and the
  user-isolation guarantee.

---

## Tech stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Language     | Python 3.11+, JavaScript (ES2015+), HTML5, CSS3                    |
| Backend      | Flask, Flask-Login, Flask-SQLAlchemy                              |
| Database     | SQLite (via SQLAlchemy)                                            |
| Auth/Hashing | Flask-Login sessions, `werkzeug.security`                         |
| Frontend     | Vanilla HTML/CSS/JS, Fetch API, Chart.js (loaded from a CDN)      |
| Testing      | pytest                                                             |

No build step and no Node toolchain are required for the frontend — it is plain
static files served by Flask.

---

## Project structure

```
NERD-finance-tracker/
├── backend/
│   ├── __init__.py
│   ├── app.py            # application factory (create_app); serves the frontend
│   ├── config.py         # Config + TestConfig (in-memory SQLite for tests)
│   ├── models.py         # User and Transaction models
│   ├── auth.py           # /api/register, /api/login, /api/logout, /api/me
│   ├── transactions.py   # /api/transactions CRUD + /api/summary
│   └── tests/
│       ├── conftest.py        # fixtures (app, client, logged-in clients)
│       ├── test_auth.py       # auth + session tests
│       └── test_transactions.py  # CRUD, summary and isolation tests
├── frontend/
│   ├── index.html        # single-page UI
│   ├── app.js            # all client logic (fetch, validation, charts)
│   └── style.css         # styling
├── requirements.txt
├── pytest.ini
└── README.md
```

---

## Getting started

> All commands below are run from inside the `NERD-finance-tracker/` directory.

### 1. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the server

```bash
python -m backend.app
```

The app starts on **http://localhost:5000** — open that URL in your browser.
On first launch a SQLite database is created automatically (under
`instance/finance.db`).

### 4. Use the app

Register an account, log in, then start adding transactions. The summary and
the three charts update automatically as you add, edit, delete or filter.

---

## Running the tests

```bash
pytest
```

Every test runs against a fresh **in-memory** SQLite database, so the suite is
fully isolated and leaves no files behind.

```
$ pytest
========================= test session starts =========================
collected 26 items

backend/tests/test_auth.py ..........                          [ 38%]
backend/tests/test_transactions.py ................            [100%]

========================= 26 passed =========================
```

---

## API reference

All endpoints accept and return JSON. Authenticated endpoints rely on the
session cookie set at login (send requests with credentials included).

| Method   | Path                       | Description                                                        | Auth |
| -------- | -------------------------- | ----------------------------------------------------------------- | :--: |
| `POST`   | `/api/register`            | Create a new user `{username, password}`                          |  No  |
| `POST`   | `/api/login`               | Log in and start a session                                        |  No  |
| `POST`   | `/api/logout`              | Log out and end the session                                       | Yes  |
| `GET`    | `/api/me`                  | Return the current user (used to restore a session on page load)  | Yes  |
| `GET`    | `/api/transactions`        | List the user's transactions (`?start=&end=&category=` filters)   | Yes  |
| `POST`   | `/api/transactions`        | Create a transaction                                              | Yes  |
| `GET`    | `/api/transactions/<id>`   | Get one transaction (owned by the user, else `404`)               | Yes  |
| `PUT`    | `/api/transactions/<id>`   | Update one transaction (owned by the user, else `404`)            | Yes  |
| `DELETE` | `/api/transactions/<id>`   | Delete one transaction (owned by the user, else `404`)            | Yes  |
| `GET`    | `/api/summary`             | Totals `{total_income, total_expenses, balance}` (same filters)   | Yes  |

### Transaction shape

```json
{
  "id": 1,
  "amount": 150.5,
  "type": "expense",
  "category": "food",
  "date": "2026-06-04",
  "description": "Groceries",
  "user_id": 1
}
```

`amount` must be a number greater than `0`, `type` must be `"income"` or
`"expense"`, `category` must be non-empty and `date` must be a valid
`YYYY-MM-DD` string. `description` is optional.

---

## The twist: charts

The "add your own twist" requirement is implemented with **three Chart.js
charts** that give insight into spending habits:

1. **Balance over time** — a line chart of the cumulative balance, ordered by
   date.
2. **Expenses by category** — a pie chart breaking down where the money goes.
3. **Monthly income vs expenses** — a grouped bar chart comparing income and
   expenses per month.

The charts respect the active filters and are re-rendered whenever a
transaction is added, edited or deleted. Previous chart instances are destroyed
before each re-render so canvases never stack or leak.

---

## Notes on design

- **Single origin, no CORS** — `create_app()` serves `index.html` and the static
  assets from the same Flask app that exposes the API, so the session cookie is
  sent with every request without any cross-origin configuration.
- **Security** — passwords are hashed with `werkzeug.security`; unauthenticated
  API requests get a JSON `401` (never an HTML redirect); and every transaction
  query is filtered by `user_id`, which is covered by an explicit isolation test.
