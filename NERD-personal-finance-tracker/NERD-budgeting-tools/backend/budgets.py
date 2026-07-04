"""Budgets blueprint: per-category spending limits for the current user.

A budget is just a ``{category, limit}`` pair. ``GET /budgets`` enriches each
limit with how much has been spent (sum of matching expenses) and what remains,
so the frontend can render progress bars without a second round-trip.
"""

import math

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

budgets_bp = Blueprint("budgets", __name__, url_prefix="/api")


@budgets_bp.route("/budgets", methods=["GET"])
@login_required
def list_budgets():
    """List the current user's budgets with computed spent/remaining amounts."""
    user_id = current_user.id
    budgets = current_app.store.get_budgets(user_id)
    transactions = current_app.store.list_transactions(user_id)

    spent_by_category = {}
    for t in transactions:
        if t["type"] == "expense":
            spent_by_category[t["category"]] = (
                spent_by_category.get(t["category"], 0) + t["amount"]
            )

    result = []
    for b in budgets:
        spent = round(spent_by_category.get(b["category"], 0), 2)
        result.append({
            "category": b["category"],
            "limit": b["limit"],
            "spent": spent,
            "remaining": round(b["limit"] - spent, 2),
        })
    result.sort(key=lambda b: b["category"])
    return jsonify(result), 200


@budgets_bp.route("/budgets", methods=["PUT"])
@login_required
def set_budget():
    """Create or update (upsert) a category budget from ``{category, limit}``."""
    data = request.get_json(silent=True) or {}

    category = (data.get("category") or "").strip()
    if not category:
        return jsonify(error="Category is required"), 400

    try:
        limit = float(data.get("limit"))
    except (TypeError, ValueError):
        return jsonify(error="Limit must be a number"), 400
    if not math.isfinite(limit):  # reject NaN / infinity
        return jsonify(error="Limit must be a number"), 400
    if limit < 0:
        return jsonify(error="Limit must be 0 or greater"), 400

    budget = current_app.store.set_budget(
        current_user.id, category, round(limit, 2)
    )
    return jsonify(budget), 200


@budgets_bp.route("/budgets/<category>", methods=["DELETE"])
@login_required
def delete_budget(category):
    """Remove a category budget for the current user."""
    if not current_app.store.delete_budget(current_user.id, category):
        return jsonify(error="Budget not found"), 404
    return jsonify(message="Budget deleted"), 200
