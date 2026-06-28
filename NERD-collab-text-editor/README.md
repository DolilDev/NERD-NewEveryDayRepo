# Real-time Collaborative Text Editor

A real-time collaborative text editor built with FastAPI, Socket.IO, and vanilla TypeScript.

## Architecture

- Backend: Python + FastAPI + python-socketio for real-time collaboration
- Frontend: HTML + SCSS + vanilla TypeScript bundled with Vite
- Auth: JWT using `python-jose` and `passlib[bcrypt]`
- Document version control: in-memory snapshot history
- Tests: `pytest`, `pytest-asyncio`, and Playwright for E2E behavior

## Tech Stack

- Python 3.11+
- FastAPI
- python-socketio
- Uvicorn
- TypeScript
- Vite
- Playwright

## Local Setup

### Backend

1. Open a terminal in `NERD-collab-text-editor/backend`
2. Create a virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. Install requirements:
   ```powershell
   pip install -r requirements.txt
   ```

### Frontend

1. Open a terminal in `NERD-collab-text-editor/frontend`
2. Install npm dependencies:
   ```powershell
   npm install
   ```

## Running the App

### Backend

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm run dev
```

Open the editor in the browser at `http://localhost:5173`.

## REST API Endpoints

### Register

`POST /api/auth/register`

Request:
```json
{
  "username": "alice",
  "password": "secret"
}
```

Response:
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### Login

`POST /api/auth/login`

Request:
```json
{
  "username": "alice",
  "password": "secret"
}
```

Response:
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### List Documents

`GET /api/documents`

Response:
```json
[
  {
    "id": "doc-1",
    "title": "My Document",
    "content": "...",
    "owner_id": "user-1",
    "collaborators": [],
    "created_at": "2026-...",
    "updated_at": "2026-..."
  }
]
```

### Create Document

`POST /api/documents`

Request:
```json
{
  "title": "New Doc",
  "content": "Hello",
  "collaborators": []
}
```

Response:
```json
{
  "id": "doc-..."
}
```

### Get Document

`GET /api/documents/{id}`

Response: document object with full content.

### Update Document

`PUT /api/documents/{id}`

Request:
```json
{
  "title": "Updated",
  "collaborators": ["user-2"]
}
```

### Delete Document

`DELETE /api/documents/{id}`

Response:
```json
{ "message": "Document deleted" }
```

### List Snapshots

`GET /api/documents/{id}/history`

Response:
```json
[
  {
    "snapshot_id": "snapshot-1",
    "content": "...",
    "saved_by": "alice",
    "saved_at": "2026-..."
  }
]
```

### Restore Snapshot

`POST /api/documents/{id}/history/{snapshot_id}/restore`

Response:
```json
{ "message": "Document restored" }
```

## WebSocket Events

### connect

Authenticate with JWT in handshake `auth` data.

### join_document

Payload:
```json
{ "doc_id": "doc-1" }
```

Broadcasts: `user_joined`

### text_change

Payload:
```json
{ "doc_id": "doc-1", "delta": "...", "cursor_position": 12 }
```

Broadcasts: `text_update`

### cursor_move

Payload:
```json
{ "doc_id": "doc-1", "cursor_position": 12 }
```

Broadcasts: `cursor_moved`

### save_snapshot

Payload:
```json
{ "doc_id": "doc-1" }
```

### disconnect

Broadcasts: `user_left`

## Tests

### Backend

```powershell
cd backend
.\.venv\Scripts\activate
pytest --cov=. --cov-report=term
```

### Frontend

```powershell
cd frontend
npm test
```

## Known Limitations

- In-memory persistence only; all data is lost on restart.
- No operational transform; last-write-wins for concurrent edits.
- Snapshot history is session-based and stored in memory.
