"""Application configuration objects.

Two configs are provided:
- ``Config``       — default/development config backed by a SQLite file.
- ``TestConfig``   — used by the pytest suite, backed by an in-memory SQLite DB
                     so every test run starts from a clean slate.
"""

import os


class Config:
    """Base configuration used when running the app normally."""

    # Prefer an env var in real deployments; fall back to a dev secret locally.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    # SQLite file living next to the backend package.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///finance.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class TestConfig(Config):
    """Configuration used by the test-suite: isolated, in-memory database."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    # Keep cookies working in the test client without HTTPS.
    WTF_CSRF_ENABLED = False
