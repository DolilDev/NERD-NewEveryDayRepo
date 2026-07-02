"""Transactions blueprint: CRUD, summary and CSV export, scoped to the user.

Every endpoint is ``@login_required`` and only touches records owned by
``current_user``. Requesting another user's record returns 404 — we never
reveal that it exists.
"""

import csv
import io
import math
from datetime import datetime

from flask import Blueprint, Response, current_app, jsonify, request
from flask_login import current_user, login_required

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
    # ``float('nan')`` / ``float('inf')`` parse fine — reject them explicitly.
    if not math.isfinite(amount):
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

    # date — parseable ISO date (kept as the original string for storage).
    raw_date = data.get("date")
    try:
        _parse_date(raw_date)
    except (TypeError, ValueError):
        return None, "Date must be in YYYY-MM-DD format"

    # description — optional free text.
    description = data.get("description")
    if description is not None:
        description = str(description).strip() or None

    return {
        "amount": round(amount, 2),
        "type": tx_type,
        "category": category,
        "date": raw_date,
        "description": description,
    }, None


def _read_filters():
    """Pull and validate optional ``start``/``end``/``category`` query params.

    Returns ``(filters_dict, None)`` or ``(None, error_message)``.
    """
    start = request.args.get("start")
    end = request.args.get("end")
    category = request.args.get("category")

    for label, value in (("start", start), ("end", end)):
        if value:
            try:
                _parse_date(value)
            except ValueError:
                return None, f"{label} must be in YYYY-MM-DD format"

    return {"start": start, "end": end, "category": category}, None


@transactions_bp.route("/transactions", methods=["GET"])
@login_required
def list_transactions():
    """List the current user's transactions (newest first), with optional filters."""
    filters, error = _read_filters()
    if error:
        return jsonify(error=error), 400
    rows = current_app.store.list_transactions(current_user.id, **filters)
    return jsonify(rows), 200


@transactions_bp.route("/transactions/<int:tx_id>", methods=["GET"])
@login_required
def get_transaction(tx_id):
    """Return a single transaction owned by the current user, else 404."""
    tx = current_app.store.get_transaction(current_user.id, tx_id)
    if tx is None:
        return jsonify(error="Transaction not found"), 404
    return jsonify(tx), 200


@transactions_bp.route("/transactions", methods=["POST"])
@login_required
def create_transaction():
    """Create a transaction for the current user."""
    cleaned, error = _validate_payload(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400
    tx = current_app.store.create_transaction(current_user.id, cleaned)
    return jsonify(tx), 201


@transactions_bp.route("/transactions/<int:tx_id>", methods=["PUT"])
@login_required
def update_transaction(tx_id):
    """Update one of the current user's transactions (same validation as create)."""
    cleaned, error = _validate_payload(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400
    tx = current_app.store.update_transaction(current_user.id, tx_id, cleaned)
    if tx is None:
        return jsonify(error="Transaction not found"), 404
    return jsonify(tx), 200


@transactions_bp.route("/transactions/<int:tx_id>", methods=["DELETE"])
@login_required
def delete_transaction(tx_id):
    """Delete one of the current user's transactions."""
    if not current_app.store.delete_transaction(current_user.id, tx_id):
        return jsonify(error="Transaction not found"), 404
    return jsonify(message="Transaction deleted"), 200


@transactions_bp.route("/summary", methods=["GET"])
@login_required
def summary():
    """Return income/expense totals and balance, honouring the list filters."""
    filters, error = _read_filters()
    if error:
        return jsonify(error=error), 400
    rows = current_app.store.list_transactions(current_user.id, **filters)
    total_income = sum(t["amount"] for t in rows if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in rows if t["type"] == "expense")
    return jsonify(
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        balance=round(total_income - total_expenses, 2),
    ), 200


@transactions_bp.route("/transactions/export.csv", methods=["GET"])
@login_required
def export_csv():
    """Export the current user's transactions as a downloadable CSV file."""
    filters, error = _read_filters()
    if error:
        return jsonify(error=error), 400
    rows = current_app.store.list_transactions(current_user.id, **filters)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "date", "type", "category", "amount", "description"])
    for t in rows:
        writer.writerow([
            t["id"],
            t["date"],
            t["type"],
            t["category"],
            t["amount"],
            t.get("description") or "",
        ])

    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=transactions.csv"
        },
    )
