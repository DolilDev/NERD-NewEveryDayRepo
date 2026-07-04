# NERD Finance Manager

A small **personal finance tracker** web app. Add income and expense records,
see your total income, total expenses and balance update live, edit or delete
entries, and visualise how income and expenses evolve month by month on a chart.

The whole stack is written in **TypeScript**: an Express REST API on the
backend, a dependency-free vanilla-TypeScript frontend, and a shared types
package so both sides speak the same data model. Records are kept in an
**in-memory store** on the server (no database), which is intentionally simple
and resettable.

---

## Features

- **Dashboard** — live totals for income, expenses and the resulting balance.
- **Add / edit / delete** records, with the dashboard, list and chart refreshing
  on every change.
- **Client-side form validation** with inline messages (positive amount,
  required fields) before any request is sent.
- **Server-side validation** and a centralized error handler returning
  user-friendly `{ error }` JSON (`400` bad input, `404` missing, `500`
  fallback).
- **Network/error feedback** — failed or rejected requests surface as toast
  notifications instead of failing silently.
- **Reset** — clear all records with one click (or `POST /api/records/reset`).
- **Twist: over-time chart** — income vs. expenses aggregated by month, drawn
  with Chart.js.

All non-trivial logic (totals, validation, monthly aggregation) lives in **pure
functions** that are unit-tested directly.

---

## Tech stack

| Area      | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Language  | TypeScript                                                    |
| Backend   | Node.js + Express 5                                           |
| Frontend  | Vanilla TypeScript (no framework), bundled with **esbuild**   |
| Chart     | Chart.js                                                      |
| Storage   | In-memory object on the server (no database)                  |
| Testing   | Jest + ts-jest, supertest (backend routes)                    |
| Type-check| `tsc` (no-emit); esbuild produces the runnable bundles        |

No other runtime dependencies are used.

---

## Project structure

```
NERD-finance-manager/
├── shared/            # Types shared by backend & frontend (FinanceRecord, ...)
│   └── src/index.ts
├── backend/
│   └── src/
│       ├── store.ts            # in-memory store (add/getAll/getById/update/delete/reset)
│       ├── validation.ts       # pure request validation
│       ├── errors.ts           # ApiError + helpers
│       ├── middleware/errorHandler.ts
│       ├── routes/records.ts   # REST endpoints
│       ├── app.ts              # Express app factory (testable)
│       ├── server.ts           # process entry point
│       └── __tests__/          # store + route tests (supertest)
├── frontend/
│   ├── public/                 # index.html, styles.css (bundle built into dist/)
│   └── src/
│       ├── api.ts              # typed fetch client
│       ├── calc.ts             # pure totals calculation
│       ├── validation.ts       # pure form validation
│       ├── aggregate.ts        # pure monthly aggregation (chart data)
│       ├── chart.ts            # Chart.js rendering
│       ├── main.ts             # DOM wiring / entry point
│       └── __tests__/          # calc, validation, aggregate tests
├── jest.config.js
├── tsconfig*.json
└── package.json
```

---

## Requirements

- **Node.js ≥ 22.6** and npm.
  - `build`, `start` and `test` work on Node 18+.
  - `npm run dev` runs the TypeScript backend directly via Node's built-in
    TypeScript support, which needs Node ≥ 22.6 (Node 24+ recommended).

---

## Getting started

```bash
cd NERD-finance-manager
npm install
```

### Run (recommended: single origin)

Build both sides, then start the server. The backend serves the API **and** the
built frontend on the same origin:

```bash
npm run build
npm start
# → http://localhost:3000
```

Open <http://localhost:3000> in your browser.

### Run (development, with live reload)

Use two terminals. The backend watches and reloads TypeScript; the frontend is
served by esbuild with rebuild-on-change. CORS is enabled so the two origins can
talk to each other, and the API client automatically targets the backend on
port 3000.

```bash
# Terminal 1 — API on :3000 (auto-reloads on change)
npm run dev

# Terminal 2 — frontend on :8000 (rebuilds on change)
npm run dev:frontend
# → http://localhost:8000
```

> The server listens on `PORT` if set, otherwise `3000`
> (e.g. `PORT=4000 npm start`).

---

## Testing

```bash
npm test               # run all backend + frontend tests
npm run test:coverage  # with a coverage report
npm run test:backend   # backend only
npm run test:frontend  # frontend only
```

Tests cover the in-memory store, every API endpoint (including validation,
404 and 500 error paths), and the pure frontend functions (totals, form
validation, monthly aggregation). Function coverage of the tested modules is
100%.

---

## API reference

Base URL: `/api`

| Method | Path                  | Description                         | Success |
| ------ | --------------------- | ----------------------------------- | ------- |
| GET    | `/health`             | Liveness probe                      | 200     |
| GET    | `/records`            | List all records                    | 200     |
| GET    | `/records/:id`        | Get one record                      | 200     |
| POST   | `/records`            | Create a record                     | 201     |
| PUT    | `/records/:id`        | Update a record                     | 200     |
| DELETE | `/records/:id`        | Delete a record                     | 204     |
| POST   | `/records/reset`      | Delete **all** records              | 200     |

Errors return `{ "error": "..." }` with status `400` (invalid body), `404`
(unknown id/route) or `500` (unexpected).

### Data model

```ts
type RecordType = 'income' | 'expense';

interface FinanceRecord {
  id: string;          // assigned by the server
  type: RecordType;
  amount: number;      // must be > 0
  category: string;
  description?: string;
  date: string;        // ISO-8601, e.g. "2026-06-18"
}
```

> The type is named `FinanceRecord` (not `Record`) to avoid shadowing
> TypeScript's built-in `Record<K, V>` utility type.

---

## Notes

- **In-memory storage**: records live in the server process and are lost when it
  restarts — that's by design for this project. Use the **Reset all** button or
  `POST /api/records/reset` to clear them on demand.
- The frontend bundle and the backend build output (`*/dist/`) are generated
  artifacts and are git-ignored; run `npm run build` to (re)create them.
