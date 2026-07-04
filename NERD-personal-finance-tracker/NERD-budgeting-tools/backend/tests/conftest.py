"""Shared pytest fixtures.

Each test runs against a fresh app whose JSON store lives in a throwaway temp
directory (``tmp_path``), so tests are fully isolated from one another and from
any real data on disk.
"""

import pytest

from backend.app import create_app
from backend.config import TestConfig


@pytest.fixture
def app(tmp_path):
    """A Flask app whose data directory is an isolated temp folder."""

    class _Config(TestConfig):
        DATA_DIR = str(tmp_path / "data")
        SECRET_KEY = "test-secret"

    return create_app(_Config)


@pytest.fixture
def client(app):
    """An unauthenticated test client."""
    return app.test_client()


@pytest.fixture
def make_user_client(app):
    """Factory: a fresh client registered and logged in as ``username``.

    Handy for multi-user tests (e.g. isolation) where each user needs its own
    session cookie.
    """

    def _make(username, password="secret"):
        client = app.test_client()
        client.post(
            "/api/register", json={"username": username, "password": password}
        )
        client.post(
            "/api/login", json={"username": username, "password": password}
        )
        return client

    return _make


@pytest.fixture
def auth_client(make_user_client):
    """A test client already registered and logged in as 'tester'."""
    return make_user_client("tester")
