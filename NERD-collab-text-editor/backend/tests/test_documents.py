import pytest
from httpx import AsyncClient

from main import fastapi_app
from store.memory import users, documents, history


@pytest.mark.asyncio
async def test_document_crud_and_history():
    users.clear()
    documents.clear()
    history.clear()
    async with AsyncClient(app=fastapi_app, base_url="http://test") as ac:
        register = await ac.post("/api/auth/register", json={"username": "owner", "password": "pass"})
        token = register.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        create_resp = await ac.post("/api/documents", json={"title": "Notes", "content": "Hello"}, headers=headers)
        assert create_resp.status_code == 201
        document = create_resp.json()
        doc_id = document["id"]

        get_resp = await ac.get(f"/api/documents/{doc_id}", headers=headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == "Notes"

        update_resp = await ac.put(f"/api/documents/{doc_id}", json={"title": "Updated"}, headers=headers)
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "Updated"

        history_resp = await ac.get(f"/api/documents/{doc_id}/history", headers=headers)
        assert history_resp.status_code == 200
        assert history_resp.json() == []

        restore_resp = await ac.post(f"/api/documents/{doc_id}/history/snapshot-1/restore", headers=headers)
        assert restore_resp.status_code == 404

        delete_resp = await ac.delete(f"/api/documents/{doc_id}", headers=headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json()["message"] == "Document deleted"


@pytest.mark.asyncio
async def test_permissions_for_documents():
    users.clear()
    documents.clear()
    history.clear()
    async with AsyncClient(app=fastapi_app, base_url="http://test") as ac:
        owner = await ac.post("/api/auth/register", json={"username": "owner", "password": "pass"})
        owner_token = owner.json()["access_token"]
        collaborator = await ac.post("/api/auth/register", json={"username": "collab", "password": "pass"})
        collab_id = users[collaborator.json()["access_token"]].get("id") if False else None
        # get collaborator id from memory by username
        collab_user = next(u for u in users.values() if u["username"] == "collab")
        collab_id = collab_user["id"]

        headers_owner = {"Authorization": f"Bearer {owner_token}"}
        create_resp = await ac.post("/api/documents", json={"title": "Shared", "content": "1", "collaborators": [collab_id]}, headers=headers_owner)
        doc_id = create_resp.json()["id"]

        headers_collab = {"Authorization": f"Bearer {collaborator.json()["access_token"]}"} if False else {"Authorization": f"Bearer {collaborator.json()["access_token"]}"}
        # use correct token string
        headers_collab = {"Authorization": f"Bearer {collaborator.json()["access_token"]}"}
        get_resp = await ac.get(f"/api/documents/{doc_id}", headers=headers_collab)
        assert get_resp.status_code == 200

        delete_resp = await ac.delete(f"/api/documents/{doc_id}", headers=headers_collab)
        assert delete_resp.status_code == 403
        assert delete_resp.json()["detail"] == "Only owner can delete"
