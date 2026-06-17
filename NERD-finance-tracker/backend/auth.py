"""Authentication blueprint: registration, login, logout and session check."""

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from backend.models import User, db

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user.

    Expects JSON ``{username, password}``. Both fields are required and the
    username must be unique. Returns the created user (201) or an error (400).
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify(error="Username and password are required"), 400

    if User.query.filter_by(username=username).first() is not None:
        return jsonify(error="Username already taken"), 400

    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Log a user in with ``{username, password}`` and start a session."""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = User.query.filter_by(username=username).first()
    if user is None or not user.check_password(password):
        return jsonify(error="Invalid credentials"), 401

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
