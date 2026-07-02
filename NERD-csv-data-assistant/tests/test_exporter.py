"""Tests for the exporter module."""

from __future__ import annotations

import json

import pandas as pd
import pytest

from src.exporter import ExporterError, export_data, serialize


def test_export_csv(sample_frame, tmp_path):
    out = tmp_path / "out.csv"
    export_data(sample_frame, out)
    assert out.exists()
    reloaded = pd.read_csv(out)
    assert reloaded.shape == sample_frame.shape
    assert list(reloaded.columns) == list(sample_frame.columns)


def test_export_json(sample_frame, tmp_path):
    out = tmp_path / "out.json"
    export_data(sample_frame, out)
    records = json.loads(out.read_text(encoding="utf-8"))
    assert len(records) == len(sample_frame)
    assert records[0]["name"] == "Anna"


def test_format_inferred_from_extension(sample_frame, tmp_path):
    out = tmp_path / "result.json"
    export_data(sample_frame, out)  # no explicit fmt
    assert out.read_text(encoding="utf-8").lstrip().startswith("[")


def test_serialize_unsupported_format_raises(sample_frame):
    with pytest.raises(ExporterError, match="Unsupported export format"):
        serialize(sample_frame, "xml")
