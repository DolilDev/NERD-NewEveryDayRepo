"""Authentication blueprint plus the Flask-Login user wrapper.

Users are stored as plain dicts in the JSON store; :class:`AuthUser` adapts a
dict to the interface Flask-Login expects. Passwords are only ever persisted as
a salted werkzeug hash — never in plaintext.
"""

from flask import Blueprint, current_app, jsonify, request
from flask_login import (
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from werkzeug.security import check_password_hash, generate_password_hash

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

MIN_PASSWORD_LENGTH = 4


class AuthUser(UserMixin):
    """Adapts a stored user dict to the Flask-Login ``UserMixin`` interface."""

    def __init__(self, record):
        self.id = record["id"]
        self.username = record["username"]
        self.password_hash = record["password_hash"]

    def get_id(self):
        return str(self.id)

    def to_dict(self):
        return {"id": self.id, "username": self.username}


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user from JSON ``{username, password}``.

    Both fields are required, the password has a minimum length and the
    username must be unique. Returns the created user (201) or an error (400).
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify(error="Username and password are required"), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return (
            jsonify(
                error=f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
            ),
            400,
        )
    if current_app.store.get_user_by_username(username) is not None:
        return jsonify(error="Username already taken"), 400

    record = current_app.store.create_user(
        username, generate_password_hash(password)
    )
    return jsonify(AuthUser(record).to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Log a user in with ``{username, password}`` and start a session."""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    record = current_app.store.get_user_by_username(username)
    if record is None or not check_password_hash(
        record["password_hash"], password
    ):
        return jsonify(error="Invalid credentials"), 401

    user = AuthUser(record)
    login_user(user)
    return jsonify(user.to_dict()), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """Log the current user out and clear their session."""
    logout_user()
    return jsonify(message="Logged out"), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return the currently authenticated user (used to restore sessions)."""
    return jsonify(current_user.to_dict()), 200
