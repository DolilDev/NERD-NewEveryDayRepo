from datetime import datetime
from typing import Dict, List, Any

users: Dict[str, Dict[str, Any]] = {}
documents: Dict[str, Dict[str, Any]] = {}
history: Dict[str, List[Dict[str, Any]]] = {}
active_sessions: Dict[str, Dict[str, str]] = {}

CHANGE_COUNTS: Dict[str, int] = {}


def create_user(user_id: str, username: str, password_hash: str) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    user = {
        "id": user_id,
        "username": username,
        "password_hash": password_hash,
        "created_at": now,
    }
    users[user_id] = user
    return user


def find_user_by_username(username: str):
    return next((u for u in users.values() if u["username"] == username), None)


def get_user(user_id: str):
    return users.get(user_id)


def create_document(doc_id: str, title: str, content: str, owner_id: str, collaborators=None):
    if collaborators is None:
        collaborators = []
    now = datetime.utcnow().isoformat()
    document = {
        "id": doc_id,
        "title": title,
        "content": content,
        "owner_id": owner_id,
        "collaborators": collaborators,
        "created_at": now,
        "updated_at": now,
    }
    documents[doc_id] = document
    history[doc_id] = []
    CHANGE_COUNTS[doc_id] = 0
    return document


def update_document(doc_id: str, title=None, collaborators=None, content=None):
    document = documents.get(doc_id)
    if not document:
        return None
    if title is not None:
        document["title"] = title
    if collaborators is not None:
        document["collaborators"] = collaborators
    if content is not None:
        document["content"] = content
    document["updated_at"] = datetime.utcnow().isoformat()
    return document


def delete_document(doc_id: str):
    documents.pop(doc_id, None)
    history.pop(doc_id, None)
    CHANGE_COUNTS.pop(doc_id, None)


def list_documents_for_user(user_id: str):
    return [
        d for d in documents.values()
        if d["owner_id"] == user_id or user_id in d["collaborators"]
    ]


def add_snapshot(doc_id: str, snapshot_id: str, content: str, saved_by: str):
    now = datetime.utcnow().isoformat()
    snapshot = {
        "snapshot_id": snapshot_id,
        "content": content,
        "saved_by": saved_by,
        "saved_at": now,
    }
    history.setdefault(doc_id, []).append(snapshot)
    return snapshot


def get_history(doc_id: str):
    return history.get(doc_id, [])


def get_snapshot(doc_id: str, snapshot_id: str):
    return next((s for s in history.get(doc_id, []) if s["snapshot_id"] == snapshot_id), None)


def save_snapshot_if_needed(doc_id: str, content: str, saved_by: str):
    count = CHANGE_COUNTS.get(doc_id, 0) + 1
    CHANGE_COUNTS[doc_id] = count
    if count >= 30:
        snapshot_id = f"snapshot-{len(history.get(doc_id, [])) + 1}"
        snapshot = add_snapshot(doc_id, snapshot_id, content, saved_by)
        CHANGE_COUNTS[doc_id] = 0
        return snapshot
    return None
