"""Flask web interface for the CSV assistant.

Features
--------
* upload a CSV file,
* pick an operation (filter / sort / aggregate) and its parameters via a form,
* see the result rendered as an HTML table,
* download the result as CSV or JSON.

Run with::

    python web/app.py
    # or
    flask --app web/app.py run
"""

from __future__ import annotations

import logging
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

import pandas as pd
from flask import (
    Flask,
    Response,
    abort,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from werkzeug.utils import secure_filename

# Make the ``src`` package importable when running this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.exporter import ExporterError, serialize  # noqa: E402
from src.loader import LoaderError, load_csv  # noqa: E402
from src.logging_config import configure_logging  # noqa: E402
from src.processor import (  # noqa: E402
    AGGREGATIONS,
    OPERATORS,
    ProcessorError,
    aggregate,
    filter_rows,
    sort_rows,
)

logger = logging.getLogger(__name__)

# In-memory store of processed results, keyed by a per-result token. Good enough
# for a single-user demo app; a production app would use a real cache/store.
_RESULTS: dict[str, pd.DataFrame] = {}

_MIME_TYPES = {"csv": "text/csv", "json": "application/json"}


def create_app() -> Flask:
    """Application factory."""
    configure_logging()
    app = Flask(__name__)
    app.secret_key = "csv-assistant-demo-key"  # only for flash messages
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB upload cap

    @app.route("/", methods=["GET"])
    def index() -> str:
        return render_template(
            "index.html", operators=list(OPERATORS), aggregations=list(AGGREGATIONS)
        )

    @app.route("/process", methods=["POST"])
    def process():
        upload = request.files.get("file")
        if upload is None or upload.filename == "":
            flash("Please choose a CSV file to upload.")
            return redirect(url_for("index"))

        operation = request.form.get("operation", "")
        try:
            frame = _load_upload(upload)
            result, summary = _apply_operation(frame, operation, request.form)
        except (LoaderError, ProcessorError, ExporterError) as exc:
            logger.warning("Web request failed: %s", exc)
            flash(str(exc))
            return redirect(url_for("index"))
        except Exception:  # noqa: BLE001 - never surface a raw traceback to the user
            logger.exception("Unexpected error while processing upload.")
            flash("An unexpected error occurred while processing the file.")
            return redirect(url_for("index"))

        token = uuid4().hex
        _RESULTS[token] = result

        return render_template(
            "result.html",
            summary=summary,
            table=result.to_html(
                index=False, classes="data-table", border=0, justify="left"
            ),
            row_count=len(result),
            token=token,
        )

    @app.route("/download/<token>/<fmt>")
    def download(token: str, fmt: str) -> Response:
        frame = _RESULTS.get(token)
        if frame is None:
            abort(404, description="Result expired or not found. Please re-run.")
        if fmt not in _MIME_TYPES:
            abort(404, description=f"Unsupported format '{fmt}'.")

        content = serialize(frame, fmt)
        logger.info("Serving download token=%s as %s.", token, fmt.upper())
        return Response(
            content,
            mimetype=_MIME_TYPES[fmt],
            headers={"Content-Disposition": f"attachment; filename=result.{fmt}"},
        )

    @app.errorhandler(413)
    def too_large(_error):
        # 413 is not a redirect status, so render the message directly.
        return render_template(
            "error.html", message="Uploaded file is too large (limit: 10 MB)."
        ), 413

    @app.errorhandler(404)
    def not_found(error):
        return render_template("error.html", message=error.description), 404

    @app.errorhandler(500)
    def server_error(_error):
        logger.exception("Unhandled server error.")
        return render_template(
            "error.html", message="An unexpected server error occurred."
        ), 500

    return app


def _load_upload(upload) -> pd.DataFrame:
    """Persist the uploaded file to a temp path and load it."""
    filename = secure_filename(upload.filename) or "upload.csv"
    tmp_dir = Path(tempfile.gettempdir())
    tmp_path = tmp_dir / f"{uuid4().hex}_{filename}"
    upload.save(tmp_path)
    try:
        logger.info("Received upload '%s'.", filename)
        return load_csv(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)


def _apply_operation(frame: pd.DataFrame, operation: str, form) -> tuple[pd.DataFrame, str]:
    """Dispatch to the requested operation, returning (result, summary)."""
    if operation == "filter":
        column = form.get("column", "")
        op = form.get("operator", "")
        value = form.get("value", "")
        result = filter_rows(frame, column, op, value)
        return result, f"Filter: {column} {op} {value}"

    if operation == "sort":
        column = form.get("column", "")
        order = form.get("order", "asc")
        result = sort_rows(frame, column, ascending=order == "asc")
        return result, f"Sort: {column} ({order})"

    if operation == "aggregate":
        column = form.get("column", "")
        agg = form.get("aggregation", "")
        value = aggregate(frame, column, agg)
        # Wrap the scalar so it can be displayed and downloaded uniformly.
        result = pd.DataFrame([{f"{agg}({column})": value}])
        return result, f"Aggregate: {agg} of {column}"

    raise ProcessorError(f"Unknown operation '{operation}'.")


# Module-level app so `flask --app web/app.py run` and `python web/app.py` work.
app = create_app()


if __name__ == "__main__":  # pragma: no cover
    app.run(debug=True, port=5000)
