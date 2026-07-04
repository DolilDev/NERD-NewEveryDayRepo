"""Data processing module.

Pure, side-effect-free transformations on a :class:`pandas.DataFrame`:

* :func:`filter_rows` — keep rows matching ``column <op> value`` where ``<op>``
  is one of ``==``, ``!=``, ``>``, ``<`` (``>=`` and ``<=`` are also accepted),
* :func:`sort_rows` — order rows by any column, ascending or descending,
* :func:`aggregate` — reduce a column with ``sum``, ``mean``/``average``,
  ``min``, ``max`` or ``count``.

Every invalid request raises :class:`ProcessorError` with a readable message.
"""

from __future__ import annotations

import logging
import operator
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# Comparison operators exposed to filtering. The four required by the spec
# (==, !=, >, <) plus the two natural companions.
OPERATORS = {
    "==": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    "<": operator.lt,
    ">=": operator.ge,
    "<=": operator.le,
}

# Aggregations. "average" is accepted as a friendly alias for "mean".
AGGREGATIONS = ("sum", "mean", "average", "min", "max", "count")


class ProcessorError(Exception):
    """Raised on an invalid processing request (bad column, operator, type)."""


def _require_column(frame: pd.DataFrame, column: str) -> None:
    if column not in frame.columns:
        available = ", ".join(map(str, frame.columns)) or "<none>"
        raise ProcessorError(
            f"Column '{column}' not found. Available columns: {available}."
        )


def _coerce_value(series: pd.Series, value: Any) -> Any:
    """Coerce ``value`` to match a numeric column so comparisons behave.

    For numeric columns a string like ``"30"`` is turned into a number; for
    non-numeric columns the value is left as-is (string comparison).
    """
    if pd.api.types.is_numeric_dtype(series):
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ProcessorError(
                f"Column '{series.name}' is numeric but value '{value}' is not a number."
            ) from exc
    return value


def filter_rows(frame: pd.DataFrame, column: str, op: str, value: Any) -> pd.DataFrame:
    """Return rows of ``frame`` where ``column op value`` holds."""
    _require_column(frame, column)
    if op not in OPERATORS:
        valid = ", ".join(OPERATORS)
        raise ProcessorError(f"Unsupported operator '{op}'. Use one of: {valid}.")

    series = frame[column]
    coerced = _coerce_value(series, value)

    try:
        mask = OPERATORS[op](series, coerced)
    except TypeError as exc:
        raise ProcessorError(
            f"Cannot compare column '{column}' with '{value}' using '{op}'."
        ) from exc

    result = frame[mask].reset_index(drop=True)
    logger.info(
        "Filtered on '%s' %s %r: %d of %d rows kept.",
        column,
        op,
        value,
        len(result),
        len(frame),
    )
    return result


def sort_rows(frame: pd.DataFrame, column: str, ascending: bool = True) -> pd.DataFrame:
    """Return ``frame`` sorted by ``column`` (stable sort)."""
    _require_column(frame, column)
    result = frame.sort_values(
        by=column, ascending=ascending, kind="mergesort"
    ).reset_index(drop=True)
    logger.info(
        "Sorted by '%s' (%s).",
        column,
        "ascending" if ascending else "descending",
    )
    return result


def aggregate(frame: pd.DataFrame, column: str, operation: str) -> Any:
    """Reduce ``column`` to a single value using ``operation``."""
    _require_column(frame, column)

    op = operation.lower()
    if op == "average":
        op = "mean"
    if op not in {"sum", "mean", "min", "max", "count"}:
        valid = ", ".join(AGGREGATIONS)
        raise ProcessorError(
            f"Unsupported aggregation '{operation}'. Use one of: {valid}."
        )

    series = frame[column]
    if op in {"sum", "mean"} and not pd.api.types.is_numeric_dtype(series):
        raise ProcessorError(
            f"Aggregation '{operation}' requires a numeric column, "
            f"but '{column}' is not numeric."
        )

    if op == "count":
        result: Any = int(series.count())
    else:
        result = getattr(series, op)()
        # Normalise numpy scalars to native Python types for clean output/JSON.
        if hasattr(result, "item"):
            result = result.item()

    logger.info("Aggregated '%s' with '%s' = %s.", column, operation, result)
    return result
