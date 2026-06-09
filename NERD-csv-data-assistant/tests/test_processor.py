"""Tests for the processor module."""

from __future__ import annotations

import pytest

from src.processor import ProcessorError, aggregate, filter_rows, sort_rows


def test_filter_numeric_greater_than(sample_frame):
    result = filter_rows(sample_frame, "salary", ">", "9000")
    assert sorted(result["name"]) == ["Piotr", "Tomasz"]


def test_filter_string_equals(sample_frame):
    result = filter_rows(sample_frame, "dept", "==", "Eng")
    assert len(result) == 2
    assert set(result["name"]) == {"Anna", "Piotr"}


def test_filter_not_equals(sample_frame):
    result = filter_rows(sample_frame, "dept", "!=", "Eng")
    assert len(result) == 2
    assert "Anna" not in set(result["name"])


def test_filter_invalid_operator_raises(sample_frame):
    with pytest.raises(ProcessorError, match="Unsupported operator"):
        filter_rows(sample_frame, "age", "~", 30)


def test_filter_missing_column_raises(sample_frame):
    with pytest.raises(ProcessorError, match="not found"):
        filter_rows(sample_frame, "missing", "==", 1)


def test_sort_ascending(sample_frame):
    result = sort_rows(sample_frame, "age", ascending=True)
    assert list(result["age"]) == [29, 35, 41, 52]


def test_sort_descending(sample_frame):
    result = sort_rows(sample_frame, "salary", ascending=False)
    assert result.iloc[0]["name"] == "Piotr"


@pytest.mark.parametrize(
    "operation,expected",
    [("sum", 36900), ("min", 7400), ("max", 11500), ("count", 4)],
)
def test_aggregate_operations(sample_frame, operation, expected):
    assert aggregate(sample_frame, "salary", operation) == expected


def test_aggregate_average_alias(sample_frame):
    assert aggregate(sample_frame, "salary", "average") == 9225.0


def test_aggregate_non_numeric_raises(sample_frame):
    with pytest.raises(ProcessorError, match="requires a numeric column"):
        aggregate(sample_frame, "name", "sum")
