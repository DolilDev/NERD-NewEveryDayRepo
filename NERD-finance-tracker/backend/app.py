"""Application factory for the Personal Finance Tracker.

``create_app`` wires together the database, the login manager and (later)
the API blueprints and static frontend. Keeping everything inside a factory
makes it trivial to spin up an isolated app for testing.
"""

from flask import Flask, jsonify
from flask_login import LoginManager
from werkzeug.exceptions import HTTPException

from backend.config import Config
from backend.models import User, db

# Extensions are created at module level (unbound) and initialised against a
# concrete app inside ``create_app``.
login_manager = LoginManager()


def register_error_handlers(app):
    """Return JSON (never HTML) for the common error codes."""

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        # Covers 400, 401, 403, 404, 405, ... with their proper status codes.
        return jsonify(error=error.description), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        # Anything not already an HTTPException is an unexpected 500.
        db.session.rollback()
        return jsonify(error="Internal server error"), 500


def create_app(config_class=Config):
    """Create and configure a Flask application instance."""
    app = Flask(
        __name__,
        static_folder="../frontend",
        static_url_path="",
    )
    app.config.from_object(config_class)

    # Initialise extensions.
    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        # API clients expect JSON 401s, never an HTML login redirect.
        return jsonify(error="Authentication required"), 401

    # JSON error handlers (before blueprints so they apply app-wide).
    register_error_handlers(app)

    # Register API blueprints.
    from backend.auth import auth_bp

    app.register_blueprint(auth_bp)

    # Create tables for any model that has been imported.
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
