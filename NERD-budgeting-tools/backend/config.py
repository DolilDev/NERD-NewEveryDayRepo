"""Application configuration objects.

Two configs are provided:
- ``Config``     — default/development config. The JSON data files live in a
                   ``data`` directory next to the project root.
- ``TestConfig`` — used by the pytest suite. The ``DATA_DIR`` is overridden per
                   test with a temporary folder so runs are fully isolated.
"""

import os

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Base configuration used when running the app normally."""

    # Prefer an env var in real deployments; fall back to a dev secret locally.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    # Directory that holds the JSON data files (users/transactions/budgets).
    DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))


class TestConfig(Config):
    """Configuration used by the test-suite. ``DATA_DIR`` is set per-test."""

    TESTING = True
