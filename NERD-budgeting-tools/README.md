# Personal Finance Tracker with Budgeting Features

A small full-stack web app for tracking personal finances. Users register, log
in, record income and expenses, set per-category budgets, watch their financial
health in charts, and export everything to CSV.

This is the solution to the NERD quest in [`QUEST.md`](./QUEST.md).

## What it is

- **Multi-user**: every account has its own isolated data; you never see anyone
  else's records.
- **Transactions**: full CRUD for income/expense entries (amount, category,
  date, optional note), with optional date/category filters.
- **Budgets**: set a spending limit per category and see how much you've spent,
  what remains, and a progress bar that turns red when you go over.
- **Charts**: monthly income vs expenses, expenses by category, and budget
  usage (spent vs limit).
- **CSV export**: download all your transactions as a `.csv` file.
- **Responsive**: works on phones, tablets and desktops.

## Tech stack

| Layer       | Technology |
| ----------- | ---------- |
| Frontend    | TypeScript (strict), HTML, CSS, [Chart.js](https://www.chartjs.org/) |
| Build/tests | esbuild (bundling), Jest + ts-jest (frontend unit tests) |
| Backend     | Python 3, [Flask](https://flask.palletsprojects.com/), [Flask-Login](https://flask-login.readthedocs.io/) |
| Auth        | Session cookies + werkzeug salted password hashing |
| Data layer  | Plain JSON files (atomic writes, no database) |
| Backend tests | pytest |

## Project structure

```
NERD-budgeting-tools/
├── backend/                 # Flask app (Python)
│   ├── app.py               # application factory + JSON error handlers
│   ├── config.py            # configuration (data dir, secret key)
│   ├── store.py             # thread-safe JSON-file storage layer
│   ├── auth.py              # register / login / logout / me
│   ├── transactions.py      # transaction CRUD + summary + CSV export
│   ├── budgets.py           # per-category budgets
│   └── tests/               # pytest suite
├── frontend/
│   ├── public/              # index.html, styles.css, dist/ (built bundle)
│   └── src/                 # TypeScript sources
│       ├── main.ts          # DOM glue / bootstrap
│       ├── api.ts           # fetch wrapper
│       ├── chart.ts         # Chart.js rendering
│       ├── validation.ts    # pure input validation  (unit tested)
│       ├── aggregate.ts     # pure aggregation        (unit tested)
│       ├── format.ts        # pure formatting         (unit tested)
│       └── __tests__/       # Jest tests
├── requirements.txt
├── package.json
└── data/                    # JSON store (created at runtime, git-ignored)
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+ (only needed to build the frontend and run its tests)

### 1. Install dependencies

```bash
cd NERD-budgeting-tools

# Backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# Frontend
npm install
```

### 2. Build the frontend

The TypeScript sources (and Chart.js) are bundled to
`frontend/public/dist/bundle.js`:

```bash
npm run build      # or `npm run watch` to rebuild on change
```

### 3. Run the app

```bash
python -m backend.app
```

Open <http://localhost:5000>, register an account, and start tracking.

> The `SECRET_KEY` and `DATA_DIR` can be overridden via environment variables.
> Data is stored as JSON files under `data/` (created automatically).

## Running the tests

```bash
# Backend (from NERD-budgeting-tools, with the venv active)
pytest

# Frontend
npm test
```

## API reference

All endpoints are JSON. Endpoints under "Auth required" use the session cookie
set at login; calling them while logged out returns `401`. Errors always come
back as `{ "error": "<message>" }` with an appropriate status code.

### Authentication

| Method | Path            | Body                       | Description |
| ------ | --------------- | -------------------------- | ----------- |
| POST   | `/api/register` | `{ username, password }`   | Create an account (password ≥ 4 chars). Returns the user. |
| POST   | `/api/login`    | `{ username, password }`   | Start a session. |
| POST   | `/api/logout`   | —                          | End the session. *(auth required)* |
| GET    | `/api/me`       | —                          | Current user; used to restore a session. *(auth required)* |

### Transactions *(auth required)*

| Method | Path                              | Body / Query | Description |
| ------ | --------------------------------- | ------------ | ----------- |
| GET    | `/api/transactions`               | `?start&end&category` (optional) | List transactions, newest first. |
| GET    | `/api/transactions/<id>`          | —            | Get one transaction (404 if not yours). |
| POST   | `/api/transactions`               | `{ type, amount, category, date, description? }` | Create. Returns the created record (201). |
| PUT    | `/api/transactions/<id>`          | same as POST | Update. |
| DELETE | `/api/transactions/<id>`          | —            | Delete. |
| GET    | `/api/summary`                    | `?start&end&category` (optional) | `{ total_income, total_expenses, balance }`. |
| GET    | `/api/transactions/export.csv`    | `?start&end&category` (optional) | Download transactions as CSV. |

**Transaction fields**

- `type` — `"income"` or `"expense"`
- `amount` — number > 0
- `category` — non-empty string
- `date` — `YYYY-MM-DD`
- `description` — optional string

### Budgets *(auth required)*

| Method | Path                     | Body                    | Description |
| ------ | ------------------------ | ----------------------- | ----------- |
| GET    | `/api/budgets`           | —                       | List budgets with `{ category, limit, spent, remaining }`. |
| PUT    | `/api/budgets`           | `{ category, limit }`   | Create or update a budget (limit ≥ 0). |
| DELETE | `/api/budgets/<category>`| —                       | Remove a budget. |

## Notes

- The JSON store uses a lock and atomic temp-file writes, so concurrent requests
  won't corrupt the data files.
- Chart.js is bundled locally (no CDN), so the app works fully offline.
- Pure logic (validation, aggregation, formatting) is split into dedicated
  modules on both sides and covered by unit tests; DOM/network/render glue is
  verified manually.
