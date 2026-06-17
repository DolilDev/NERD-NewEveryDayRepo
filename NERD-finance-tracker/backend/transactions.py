"""Transactions blueprint: CRUD + summary, all scoped to the current user.

Every endpoint is protected by ``@login_required`` and only ever touches rows
belonging to ``current_user``. Attempts to reach another user's transaction
return 404 (we never reveal that the row exists).
"""

from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from backend.models import Transaction, db

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api")

VALID_TYPES = ("income", "expense")


def _parse_date(value):
    """Parse a ``YYYY-MM-DD`` string into a date (raises ValueError on bad input)."""
    return datetime.strptime(value, "%Y-%m-%d").date()


def _validate_payload(data):
    """Validate transaction input.

    Returns ``(cleaned_dict, None)`` on success or ``(None, error_message)``.
    """
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object"

    # amount — numeric and strictly positive.
    try:
        amount = float(data.get("amount"))
    except (TypeError, ValueError):
        return None, "Amount must be a number"
    if amount <= 0:
        return None, "Amount must be greater than 0"

    # type — income or expense.
    tx_type = data.get("type")
    if tx_type not in VALID_TYPES:
        return None, "Type must be 'income' or 'expense'"

    # category — non-empty.
    category = (data.get("category") or "").strip()
    if not category:
        return None, "Category is required"

    # date — parseable ISO date.
    try:
        tx_date = _parse_date(data.get("date"))
    except (TypeError, ValueError):
        return None, "Date must be in YYYY-MM-DD format"

    # description — optional free text.
    description = data.get("description")
    if description is not None:
        description = str(description).strip() or None

    return {
        "amount": amount,
        "type": tx_type,
        "category": category,
        "date": tx_date,
        "description": description,
    }, None


@transactions_bp.route("/transactions", methods=["POST"])
@login_required
def create_transaction():
    """Create a transaction for the current user."""
    data = request.get_json(silent=True)
    cleaned, error = _validate_payload(data)
    if error:
        return jsonify(error=error), 400

    transaction = Transaction(user_id=current_user.id, **cleaned)
    db.session.add(transaction)
    db.session.commit()
    return jsonify(transaction.to_dict()), 201
