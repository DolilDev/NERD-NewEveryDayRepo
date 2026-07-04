"""Shared pytest fixtures."""

from __future__ import annotations

import pandas as pd
import pytest


@pytest.fixture
def sample_frame() -> pd.DataFrame:
    """A small in-memory DataFrame used by processor/exporter tests."""
    return pd.DataFrame(
        {
            "name": ["Anna", "Piotr", "Maria", "Tomasz"],
            "dept": ["Eng", "Eng", "Mkt", "Sales"],
            "age": [29, 41, 35, 52],
            "salary": [8200, 11500, 7400, 9800],
        }
    )


@pytest.fixture
def comma_csv(tmp_path):
    """Path to a comma-separated CSV file."""
    path = tmp_path / "data.csv"
    path.write_text(
        "name,age,salary\nAnna,29,8200\nPiotr,41,11500\n", encoding="utf-8"
    )
    return path


@pytest.fixture
def semicolon_csv(tmp_path):
    """Path to a semicolon-separated CSV file (second supported format)."""
    path = tmp_path / "data_semi.csv"
    path.write_text(
        "name;age;salary\nAnna;29;8200\nPiotr;41;11500\n", encoding="utf-8"
    )
    return path
