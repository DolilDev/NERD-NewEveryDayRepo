"""Application factory for the Personal Finance Tracker.

``create_app`` wires together the JSON store, Flask-Login and the API
blueprints, and serves the compiled TypeScript frontend as static files.
Keeping everything inside a factory makes it trivial to spin up an isolated app
(pointed at a temporary data directory) for testing.
"""

from flask import Flask, jsonify
from flask_login import LoginManager
from werkzeug.exceptions import HTTPException

from backend.auth import AuthUser
from backend.config import Config
from backend.store import JSONStore

# Extension created at module level (unbound) and initialised inside the factory.
login_manager = LoginManager()


def register_error_handlers(app):
    """Return JSON (never HTML) for both expected and unexpected errors."""

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        # Covers 400, 401, 403, 404, 405, ... with their proper status codes.
        return jsonify(error=error.description), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):  # noqa: ARG001 - signature required
        # Anything not already an HTTPException is an unexpected 500.
        return jsonify(error="Internal server error"), 500


def create_app(config_class=Config):
    """Create and configure a Flask application instance."""
    app = Flask(
        __name__,
        static_folder="../frontend/public",
        static_url_path="",
    )
    app.config.from_object(config_class)

    # The data layer is attached to the app so blueprints reach it via
    # ``current_app.store`` and tests can point it at a temp directory.
    app.store = JSONStore(app.config["DATA_DIR"])

    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        record = app.store.get_user_by_id(int(user_id))
        return AuthUser(record) if record else None

    @login_manager.unauthorized_handler
    def unauthorized():
        # API clients expect JSON 401s, never an HTML login redirect.
        return jsonify(error="Authentication required"), 401

    # JSON error handlers (before blueprints so they apply app-wide).
    register_error_handlers(app)

    # Register API blueprints.
    from backend.budgets import budgets_bp
    from backend.transactions import transactions_bp

    from backend.auth import auth_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(budgets_bp)

    # Serve the single-page frontend. Other assets (styles.css, dist/bundle.js)
    # are served automatically from the static folder because static_url_path="".
    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
