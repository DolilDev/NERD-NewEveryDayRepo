"""Tests for the CLI entry point."""

from __future__ import annotations

from src.cli import main


def test_cli_aggregate_success(comma_csv, capsys):
    exit_code = main(["aggregate", "-f", str(comma_csv), "-c", "age", "--operation", "sum"])
    out = capsys.readouterr().out
    assert exit_code == 0
    assert "sum(age) = 70" in out


def test_cli_filter_and_export(comma_csv, tmp_path):
    out_file = tmp_path / "filtered.json"
    exit_code = main(
        ["filter", "-f", str(comma_csv), "-c", "age", "--op", ">", "--value", "30",
         "-o", str(out_file)]
    )
    assert exit_code == 0
    assert out_file.exists()


def test_cli_error_returns_nonzero(comma_csv, capsys):
    exit_code = main(["aggregate", "-f", str(comma_csv), "-c", "missing", "--operation", "sum"])
    err = capsys.readouterr().err
    assert exit_code == 1
    assert "Error:" in err
