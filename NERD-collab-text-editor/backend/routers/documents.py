from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from uuid import uuid4

from middleware.auth import get_current_user
from store.memory import (
    add_snapshot,
    create_document,
    delete_document,
    find_user_by_username,
    get_history,
    get_snapshot,
    get_user,
    list_documents_for_user,
    update_document,
    save_snapshot_if_needed,
    documents,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


def check_document_access(doc_id: str, user_id: str):
    document = documents.get(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document["owner_id"] != user_id and user_id not in document["collaborators"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    return document


def validate_collaborators(collaborator_ids: List[str]):
    for collaborator_id in collaborator_ids:
        if not get_user(collaborator_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid collaborator id: {collaborator_id}")


@router.get("")
def list_documents(user: dict = Depends(get_current_user)):
    return list_documents_for_user(user["id"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_new_document(payload: dict, user: dict = Depends(get_current_user)):
    title = payload.get("title")
    content = payload.get("content", "")
    collaborators = payload.get("collaborators", [])
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")
    validate_collaborators(collaborators)
    doc_id = f"doc-{uuid4().hex}"
    document = create_document(doc_id, title, content, user["id"], collaborators)
    return document


@router.get("/{doc_id}")
def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    return check_document_access(doc_id, user["id"])


@router.put("/{doc_id}")
def update_document_endpoint(doc_id: str, payload: dict, user: dict = Depends(get_current_user)):
    document = documents.get(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document["owner_id"] != user["id"] and user["id"] not in document["collaborators"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    title = payload.get("title")
    collaborators = payload.get("collaborators")
    if collaborators is not None:
        validate_collaborators(collaborators)
    updated = update_document(doc_id, title=title, collaborators=collaborators)
    return updated


@router.delete("/{doc_id}")
def delete_document_endpoint(doc_id: str, user: dict = Depends(get_current_user)):
    document = documents.get(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document["owner_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete")
    delete_document(doc_id)
    return {"message": "Document deleted"}


@router.get("/{doc_id}/history")
def get_document_history(doc_id: str, user: dict = Depends(get_current_user)):
    check_document_access(doc_id, user["id"])
    return get_history(doc_id)


@router.post("/{doc_id}/history/{snapshot_id}/restore")
def restore_snapshot(doc_id: str, snapshot_id: str, user: dict = Depends(get_current_user)):
    check_document_access(doc_id, user["id"])
    snapshot = get_snapshot(doc_id, snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found")
    update_document(doc_id, content=snapshot["content"])
    return {"message": "Document restored"}
