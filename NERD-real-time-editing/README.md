# Real-Time Collaborative Text Editor

A full-stack, real-time collaborative text editor. Multiple authenticated users
can open the same document, type at the same time, and see each other's
changes appear instantly over a WebSocket connection. Every save is kept as a
version snapshot, so any collaborator can browse the document's history and
revert it to an earlier version.

## What it is

- **Frontend**: a TypeScript single-page app using [CodeMirror 6](https://codemirror.net/)
  as the text editor. It handles login/registration, lists a user's documents,
  and synchronizes live edits over WebSocket.
- **Backend**: a minimal Express server that exposes REST endpoints for
  authentication and document listing, plus a WebSocket endpoint that
  broadcasts edits between everyone connected to the same document.
- **Auth**: JWT-based sessions. Users register an account, log in, and their
  documents are saved under their profile.
- **Version history & revert**: every synchronized edit is appended to a
  document's history log with a version number, author, and timestamp. Any
  collaborator can pick an older version from the dropdown and revert the
  live document to it (the revert itself is recorded as a new version, so
  nothing is ever destroyed).

## Project structure

```
collab-editor/
├── server/               # Express + WebSocket backend
│   ├── src/
│   │   ├── server.ts             # HTTP routes + WebSocket connection handling
│   │   ├── auth.ts               # register/login, JWT signing & verification
│   │   ├── documentManager.ts    # applies edits, keeps history, handles revert
│   │   ├── db.ts                 # tiny JSON-file persistence layer
│   │   └── types.ts              # shared REST/WebSocket message types
│   └── tests/                    # Jest unit tests
└── client/               # TypeScript + Vite + CodeMirror frontend
    ├── src/
    │   ├── main.ts        # UI screens (auth, document list, editor) + CodeMirror wiring
    │   ├── collab.ts       # WebSocket sync/reconnect logic (framework-agnostic)
    │   ├── api.ts          # REST client for auth & document listing
    │   └── types.ts        # shared REST/WebSocket message types
    └── tests/              # Vitest unit tests
```

Client and server are fully independent Node projects (separate
`package.json`, `tsconfig.json`, dependencies, and test runners), communicating
only over HTTP/WebSocket.

## How synchronization works

The server holds the authoritative copy of every document. When a client
edits the text, CodeMirror reports the change as `{ from, to, insert }`
ranges, which are sent to the server as an `edit` message. The server applies
the change to its copy, bumps the document's version number, appends a
history snapshot, and re-broadcasts the change to every other client viewing
that document. Each client applies incoming remote changes to its own editor
without re-broadcasting them (an internal "remote" annotation prevents
feedback loops).

This is a simple, centrally-authoritative synchronization model (not a full
CRDT/OT implementation) — good enough for demoing real-time collaboration and
easy to extend later.

## Error handling

- The WebSocket client automatically reconnects with exponential backoff if
  the connection drops, and surfaces connection state (`connecting`,
  `open`, `reconnecting`, `closed`) to the UI.
- Invalid or missing auth tokens are rejected before a WebSocket connection is
  accepted.
- Malformed messages, out-of-range edits, and requests for documents/versions
  that don't exist are caught and returned to the client as `error` messages
  instead of crashing the server or the socket.
- Client disconnects are detected on the server (`socket.on('close')`), and
  other collaborators are notified via a `peer-left` message.

## What was used

- **Languages**: TypeScript (both frontend and backend)
- **Frontend**: Vite, CodeMirror 6 (`@codemirror/state`, `@codemirror/view`,
  `@codemirror/commands`), Vitest + jsdom for tests
- **Backend**: Node.js, Express, `ws` (WebSocket), `jsonwebtoken`, `bcryptjs`,
  Jest + ts-jest for tests
- **Storage**: a small JSON file used as the database (no external DB
  required to run the project)

## Running the project

Requires Node.js 18+.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # optional, defaults work out of the box
npm run dev            # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env   # optional, defaults point at localhost:4000
npm run dev            # starts on http://localhost:5173
```

Open `http://localhost:5173` in two different browser windows (or one normal
and one incognito window), register/log in with two different accounts, open
the same document from both, and type — changes appear on both screens in
real time. Use the "Version history" dropdown and "Revert to selected" button
to roll a document back to an earlier snapshot.

### 3. Running tests

```bash
cd server && npm test    # Jest: auth + document sync/revert logic
cd client && npm test    # Vitest: WebSocket sync/reconnect logic
```

## Possible extensions

- Replace the position-based sync with a proper CRDT (e.g. Yjs) for true
  conflict-free concurrent editing.
- Add per-document collaborator lists / sharing instead of open-by-id access.
- Persist to a real database (Postgres/SQLite) instead of a JSON file.
