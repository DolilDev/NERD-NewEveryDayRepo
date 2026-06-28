import pytest
from httpx import AsyncClient

from main import app as fastapi_app
from store.memory import users


@pytest.mark.asyncio
async def test_register_login_and_duplicate_username():
    async with AsyncClient(app=fastapi_app, base_url="http://test") as ac:
        response = await ac.post("/api/auth/register", json={"username": "alice", "password": "secret"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

        response = await ac.post("/api/auth/login", json={"username": "alice", "password": "secret"})
        assert response.status_code == 200
        assert response.json()["access_token"]

        response = await ac.post("/api/auth/register", json={"username": "alice", "password": "secret"})
        assert response.status_code == 409
        assert response.json()["detail"] == "Username already exists"

        response = await ac.post("/api/auth/login", json={"username": "alice", "password": "wrong"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_register_requires_username_and_password():
    async with AsyncClient(app=fastapi_app, base_url="http://test") as ac:
        response = await ac.post("/api/auth/register", json={})
        assert response.status_code == 400
        assert response.json()["detail"] == "Username and password required"
