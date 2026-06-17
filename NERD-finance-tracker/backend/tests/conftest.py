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


def register_and_login(client, username, password="secret"):
    """Helper: register a user and log them in on the given client."""
    client.post("/api/register", json={"username": username, "password": password})
    client.post("/api/login", json={"username": username, "password": password})
    return client


@pytest.fixture
def auth_client(app):
    """A test client already registered and logged in as 'tester'."""
    return register_and_login(app.test_client(), "tester")
