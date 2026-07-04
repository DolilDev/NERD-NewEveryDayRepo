"""Shared pytest fixtures.

Every test runs against a fresh in-memory SQLite database (TestConfig), so
tests are fully isolated from one another and from the dev database.
"""

import pytest

from backend.app import create_app
from backend.config import TestConfig
from backend.models import db


@pytest.fixture
def app():
    """A Flask app bound to an isolated in-memory database."""
    app = create_app(TestConfig)
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """An unauthenticated test client."""
    return app.test_client()


@pytest.fixture
def make_user_client(app):
    """Factory: returns a fresh client registered and logged in as ``username``.

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
