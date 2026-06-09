"""Tests for the loader module."""

from __future__ import annotations

import pytest

from src.loader import LoaderError, detect_delimiter, detect_encoding, load_csv


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


def test_inconsistent_column_count_raises(tmp_path):
    ragged = tmp_path / "ragged.csv"
    ragged.write_text("name,age,city\nAnna,29,Warsaw\nPiotr,41\n", encoding="utf-8")
    with pytest.raises(LoaderError, match="Inconsistent number of columns"):
        load_csv(ragged)


def test_latin1_encoding_is_detected(tmp_path):
    latin = tmp_path / "latin.csv"
    # "Müller" / "café" are not valid UTF-8 when written as Latin-1 bytes.
    latin.write_bytes("name;city\nM\xfcller;caf\xe9\n".encode("latin-1"))
    assert detect_encoding(latin) == "latin-1"
    frame = load_csv(latin)
    assert frame.shape == (1, 2)
    assert frame.loc[0, "name"] == "Müller"
