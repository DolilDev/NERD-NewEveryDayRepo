# Real-Time Collaborative Markdown Editor

A real-time collaborative Markdown editor. Multiple people open the same page,
type Markdown, and see each other's changes live with a synchronized HTML
preview. The frontend is vanilla **TypeScript**, the backend is **Python**
(FastAPI), and they talk over **Socket.IO**.

A "room" is one shared document (the default room is `main`). The server keeps
the document state in memory and rebroadcasts edits to everyone else in the room.

## Features

- **Real-time collaboration** — edits are broadcast to other clients in the room
  over Socket.IO; new/reconnecting clients receive the current document on join.
- **Reconnect without losing state** — the server keeps each room's content when
  users disconnect, so a reconnecting client gets the latest content back.
- **Cursor-safe sync** — incoming remote content is applied without jumping your
  caret: the selection is mapped across the edit and clamped to stay valid.
- **Typing lock** — while you are actively typing, remote updates are buffered
  and applied a short moment after your last keystroke, instead of yanking the
  text out from under you mid-edit.
- **Offline editing** — if the connection drops you keep editing locally; the
  latest content is flushed to the server once you reconnect, and a status
  banner shows **Connected / Reconnecting… / Offline**.
- **Syntax highlighting** — fenced code blocks are highlighted with highlight.js.
- **Local persistence** — your document is saved to `localStorage` and restored
  on reload, then reconciled with the server's content when you join.
- **Lightweight identity** — pick a display name; the server tracks the active
  collaborators per room and broadcasts the roster, shown in the header.

## Project layout

```
backend/          Python + FastAPI + python-socketio server
  app/
    main.py       ASGI app: serves the built client + /health, mounts Socket.IO
    session.py    SessionManager — pure in-memory room/document state
    sockets.py    Socket.IO event handlers (join, doc:update, disconnect)
  tests/          pytest unit tests (SessionManager + socket handlers)
frontend/         Vanilla TypeScript client, bundled with esbuild
  src/
    index.html    Editor layout (textarea + live preview)
    main.ts       Client wiring (sockets, sync, status, persistence, identity)
    markdown.ts   Pure Markdown -> HTML rendering (marked + highlight.js)
    sync.ts       Pure sync helpers (applyRemote, debounce, RemoteBuffer)
    storage.ts    localStorage wrappers
  tests/          Jest unit tests (markdown render + sync logic)
```

## Prerequisites

- Python 3.10+ (developed on 3.14)
- Node.js 18+ and npm

## Running it

The backend serves the **built** frontend, so build the client first, then start
the server.

### 1. Build the frontend

```bash
cd frontend
npm install
npm run build        # bundles src/ into frontend/dist/ (index.html + bundle.js)
```

### 2. Run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000>. Open it in two tabs/browsers to see real-time
collaboration. A health check is available at <http://localhost:8000/health>.

> The static client is wired up when the server starts, so after rebuilding the
> frontend, restart the backend to pick up the new bundle. Until the client is
> built, the server shows a short "frontend not built" placeholder at `/`.

## Running the tests

Backend (pytest + pytest-asyncio):

```bash
cd backend
.venv/bin/python -m pytest        # or just `pytest` with the venv activated
```

Frontend (Jest + ts-jest):

```bash
cd frontend
npm test
npm run typecheck                 # optional: strict TypeScript type-check
```

## Socket.IO protocol

| Direction        | Event        | Payload                          |
| ---------------- | ------------ | -------------------------------- |
| client → server  | `join`       | `{ room, name }`                 |
| client → server  | `doc:update` | `{ room, content }`              |
| server → client  | `doc:sync`   | `{ content }`                    |
| server → client  | `users`      | `{ users: string[] }`            |

## Tech used

- **Backend:** Python, FastAPI, uvicorn, python-socketio (ASGI), pytest,
  pytest-asyncio
- **Frontend:** vanilla TypeScript, esbuild, socket.io-client, marked,
  highlight.js, Jest, ts-jest

## Design note: last-write-wins (intentional)

Concurrency is handled with a deliberate **last-write-wins** model — there is no
Operational Transform or CRDT. When two clients edit at the same time, the most
recent `doc:update` simply overwrites the stored content.

The cursor-safe sync and the typing lock described above **reduce** the chance of
clobbering and keep the editing experience smooth, but they do **not** eliminate
conflicts. This is an intentional scope decision for a lightweight editor: it
keeps the server simple and the behavior predictable. Building real conflict-free
concurrent editing (OT/CRDT) is explicitly out of scope.
