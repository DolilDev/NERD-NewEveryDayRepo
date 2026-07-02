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


def _apply_filters(query):
    """Apply optional ``start``/``end``/``category`` query params to a query.

    Returns ``(query, None)`` or ``(None, error_message)`` for bad date input.
    """
    start = request.args.get("start")
    end = request.args.get("end")
    category = request.args.get("category")

    if start:
        try:
            query = query.filter(Transaction.date >= _parse_date(start))
        except (TypeError, ValueError):
            return None, "start must be in YYYY-MM-DD format"
    if end:
        try:
            query = query.filter(Transaction.date <= _parse_date(end))
        except (TypeError, ValueError):
            return None, "end must be in YYYY-MM-DD format"
    if category:
        query = query.filter(Transaction.category == category)

    return query, None


def _get_owned_transaction_or_404(transaction_id):
    """Fetch a transaction by id, but only if it belongs to the current user.

    Returns the transaction or ``None`` (caller turns ``None`` into a 404).
    Filtering by ``user_id`` here is what enforces per-user isolation.
    """
    return Transaction.query.filter_by(
        id=transaction_id, user_id=current_user.id
    ).first()


@transactions_bp.route("/transactions", methods=["GET"])
@login_required
def list_transactions():
    """List the current user's transactions (newest first), with optional filters."""
    query = Transaction.query.filter_by(user_id=current_user.id)
    query, error = _apply_filters(query)
    if error:
        return jsonify(error=error), 400

    transactions = query.order_by(
        Transaction.date.desc(), Transaction.id.desc()
    ).all()
    return jsonify([t.to_dict() for t in transactions]), 200


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["GET"])
@login_required
def get_transaction(transaction_id):
    """Return a single transaction owned by the current user, else 404."""
    transaction = _get_owned_transaction_or_404(transaction_id)
    if transaction is None:
        return jsonify(error="Transaction not found"), 404
    return jsonify(transaction.to_dict()), 200


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


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["PUT"])
@login_required
def update_transaction(transaction_id):
    """Update one of the current user's transactions (same validation as create)."""
    transaction = _get_owned_transaction_or_404(transaction_id)
    if transaction is None:
        return jsonify(error="Transaction not found"), 404

    data = request.get_json(silent=True)
    cleaned, error = _validate_payload(data)
    if error:
        return jsonify(error=error), 400

    for field, value in cleaned.items():
        setattr(transaction, field, value)
    db.session.commit()
    return jsonify(transaction.to_dict()), 200


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["DELETE"])
@login_required
def delete_transaction(transaction_id):
    """Delete one of the current user's transactions."""
    transaction = _get_owned_transaction_or_404(transaction_id)
    if transaction is None:
        return jsonify(error="Transaction not found"), 404

    db.session.delete(transaction)
    db.session.commit()
    return jsonify(message="Transaction deleted"), 200


@transactions_bp.route("/summary", methods=["GET"])
@login_required
def summary():
    """Return income/expense totals and balance for the current user.

    Honours the same ``start``/``end``/``category`` filters as the list endpoint.
    """
    query = Transaction.query.filter_by(user_id=current_user.id)
    query, error = _apply_filters(query)
    if error:
        return jsonify(error=error), 400

    transactions = query.all()
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expenses = sum(t.amount for t in transactions if t.type == "expense")

    return jsonify(
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        balance=round(total_income - total_expenses, 2),
    ), 200
