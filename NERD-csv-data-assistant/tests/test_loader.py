"""Tests for the loader module."""

from __future__ import annotations

import pytest

from src.loader import LoaderError, detect_delimiter, load_csv


def test_load_comma_csv(comma_csv):
    frame = load_csv(comma_csv)
    assert frame.shape == (2, 3)
    assert list(frame.columns) == ["name", "age", "salary"]
    assert frame.loc[0, "name"] == "Anna"


def test_load_semicolon_csv_autodetects_delimiter(semicolon_csv):
    assert detect_delimiter(semicolon_csv) == ";"
    frame = load_csv(semicolon_csv)
    assert frame.shape == (2, 3)
    assert list(frame.columns) == ["name", "age", "salary"]


def test_missing_file_raises(tmp_path):
    with pytest.raises(LoaderError, match="File not found"):
        load_csv(tmp_path / "does_not_exist.csv")


def test_empty_file_raises(tmp_path):
    empty = tmp_path / "empty.csv"
    empty.write_text("", encoding="utf-8")
    with pytest.raises(LoaderError, match="empty"):
        load_csv(empty)


def test_blank_headers_raise(tmp_path):
    bad = tmp_path / "bad.csv"
    # Leading comma -> pandas labels the first column "Unnamed: 0".
    bad.write_text(",age\n1,29\n", encoding="utf-8")
    with pytest.raises(LoaderError, match="missing or blank column headers"):
        load_csv(bad)
