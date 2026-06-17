"""Authentication blueprint: registration, login, logout and session check."""

from flask import Blueprint, jsonify, request

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
