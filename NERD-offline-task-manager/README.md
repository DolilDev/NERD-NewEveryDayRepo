# NERD Offline Task Manager

A small **offline-first desktop task manager** built with Electron and TypeScript.
Tasks are stored locally in SQLite, so the app works with no network connection.
You can "sync" through the cloud in two ways: export/import a JSON file, or — when
configured — push/pull tasks to a Firebase Firestore collection. The codebase is
deliberately split into thin, single-purpose layers that can be understood and
tested in isolation.

## Features

- Add, edit and delete tasks with title, description and status (`To do`, `In progress`, `Done`).
- Local persistence in a SQLite database (no server required).
- Input validation with clear, user-facing error messages — raw errors never reach the UI.
- JSON **export/import** that merges by task id (existing tasks updated, new ones inserted).
- Optional **Firebase Firestore** cloud sync (push/pull), with graceful degradation:
  without credentials the cloud buttons are disabled and everything else still works.
- Filter the list by status, sort it (newest / oldest / title) and a live task counter.
- Unit and end-to-end tests for the business-logic, synchronisation and UI layers.

## Tech stack

| Area           | Choice                                             |
| -------------- | -------------------------------------------------- |
| Language       | TypeScript                                         |
| Desktop shell  | Electron                                           |
| Local database | SQLite via `better-sqlite3` (synchronous driver)   |
| Cloud sync     | Firebase Firestore (optional), config via `dotenv` |
| Unit tests     | Jest + ts-jest                                     |
| E2E tests      | Playwright                                         |
| Lint / format  | ESLint + Prettier                                  |
| Packaging      | electron-builder                                   |
| Native rebuild | `@electron/rebuild`                                |

## Architecture

The app is organised in layers. Each one has a single responsibility and talks to
the next through a narrow interface, which keeps the business logic free of Electron
and easy to unit test.

```
 Renderer (UI)                      src/renderer
   │  window.api.*  (no Node, no DB access)
   ▼
 Preload bridge  ── contextBridge ─ src/main/preload.ts
   │  IPC invoke
   ▼
 IPC handlers                       src/main/ipc.ts
   │  wraps results / serialises errors
   ▼
 TaskService  (validation + logic)  src/main/services/taskService.ts
 SyncService  (JSON + cloud)         src/main/services/syncService.ts
   │
   ▼
 TaskRepository  (pure SQL)          src/main/db/taskRepository.ts
   │
   ▼
 SQLite database                     <userData>/tasks.sqlite
```

Why the split:

- **Renderer** only renders and calls `window.api`. It has no Node or database access
  (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, plus a CSP).
- **Preload** exposes a small, typed `window.api` over `contextBridge` — the only bridge
  between the UI and the backend.
- **IPC handlers** translate each call into a service call and return a typed
  `{ ok, data } | { ok: false, error }` envelope, so the UI can handle failures safely.
- **TaskService** owns all validation rules and id/timestamp assignment.
- **SyncService** handles JSON export/import and cloud push/pull, reusing the same
  validation and merge-by-id logic. Firestore sits behind a `CloudGateway` interface
  so it can be swapped for a fake in tests.
- **TaskRepository** is pure CRUD SQL — no validation, no business logic.

## Project structure

```
src/
  main/
    main.ts              app/window lifecycle, wiring
    ipc.ts               IPC handlers (bridge to the backend)
    ipcChannels.ts       channel name constants
    preload.ts           contextBridge -> window.api
    config.ts            reads Firebase config from .env
    db/
      connection.ts      opens SQLite + schema migration
      taskRepository.ts  pure CRUD SQL
    services/
      validation.ts      input validation rules
      taskService.ts     business logic
      syncService.ts     JSON + cloud synchronisation
    cloud/
      cloudGateway.ts        cloud backend interface
      firestoreCloudGateway.ts Firestore implementation (lazy-loaded)
  renderer/
    index.html           markup + inline CSS
    renderer.ts          UI logic
  shared/
    types.ts             shared domain & IPC types (type-only)
    errors.ts            ValidationError / NotFoundError / SyncError
tests/
  taskService.test.ts
  syncService.test.ts
  firestoreCloudGateway.test.ts
e2e/
  app.spec.ts            Playwright end-to-end test
```

## Getting started

### Prerequisites

- Node.js 20+ and npm.
- A C/C++ toolchain for building the native SQLite module (build-essential / Xcode CLT / MSVC build tools).

### Install

```bash
npm install
```

### Run the app

```bash
npm start
```

`npm start` compiles the TypeScript, rebuilds the native SQLite module against
Electron's ABI, and launches the app.

> **Native module note.** `better-sqlite3` is a native addon and must match the ABI of
> whatever runs it. The app (Electron) and the tests (plain Node) need different builds,
> so the scripts handle it automatically: `npm start` rebuilds for Electron
> (`rebuild:electron`), and `npm test` rebuilds for Node first (`pretest`). If you ever
> hit a `NODE_MODULE_VERSION` error, just re-run the relevant command.

### Run the tests

```bash
npm test
```

This rebuilds `better-sqlite3` for Node, then runs the Jest suite (TaskService against an
in-memory SQLite database, SyncService with an in-memory file gateway and a fake cloud).

### End-to-end tests

```bash
npm run test:e2e
```

Builds the app, rebuilds the native module for Electron and runs the Playwright suite,
which launches the real app and drives the UI (add → edit → filter → delete).

### Lint and format

```bash
npm run lint          # ESLint
npm run format        # Prettier (write)
npm run format:check  # Prettier (verify)
```

### Package a distributable

```bash
npm run pack   # unpacked app in release/ (fast)
npm run dist   # AppImage in release/
```

## Cloud sync with Firestore (optional)

The app is fully usable without any cloud configuration. To enable Firestore push/pull:

1. Create a Firebase project and a Firestore database.
2. Copy `.env.example` to `.env` and fill in the values from your Firebase project
   (Project settings → General → Your apps → SDK setup and configuration):

   ```
   FIREBASE_API_KEY=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_APP_ID=...
   ```

   Optional keys (`FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`,
   `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_TASKS_COLLECTION`) have sensible defaults.

3. Restart the app. The cloud status line turns to "ready" and the **Push to cloud** /
   **Pull from cloud** buttons become enabled.

`.env` is git-ignored and must never be committed. If the required keys are missing,
cloud sync stays disabled and the offline features are unaffected.

## Data storage

The SQLite file lives in Electron's per-user data directory, e.g.
`~/.config/nerd-offline-task-manager/tasks.sqlite` on Linux. JSON backups are written
wherever you choose in the export dialog.

## License

MIT
