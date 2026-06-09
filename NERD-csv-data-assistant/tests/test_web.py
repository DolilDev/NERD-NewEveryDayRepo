"""Tests for the Flask web interface."""

from __future__ import annotations

import io
import re

import pytest

from web.app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def _csv_bytes() -> bytes:
    return b"name,age,salary\nAnna,29,8200\nPiotr,41,11500\n"


def test_index_renders_form(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"<form" in response.data


def test_process_filter_and_download(client):
    response = client.post(
        "/process",
        data={
            "file": (io.BytesIO(_csv_bytes()), "data.csv"),
            "operation": "filter",
            "column": "age",
            "operator": ">",
            "value": "30",
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "Piotr" in html and "Anna" not in html

    token = re.search(r"/download/([0-9a-f]+)/csv", html).group(1)
    csv_resp = client.get(f"/download/{token}/csv")
    assert csv_resp.status_code == 200
    assert "Piotr" in csv_resp.get_data(as_text=True)


def test_process_invalid_column_flashes_error(client):
    response = client.post(
        "/process",
        data={
            "file": (io.BytesIO(_csv_bytes()), "data.csv"),
            "operation": "aggregate",
            "column": "missing",
            "aggregation": "sum",
        },
        content_type="multipart/form-data",
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert "not found" in response.get_data(as_text=True)
