"""Export module.

Serialize a processed :class:`pandas.DataFrame` to CSV or JSON, either as an
in-memory string (used by the web app for downloads) or written to disk (used
by the CLI). Failures surface as :class:`ExporterError` with readable messages.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Union

import pandas as pd

logger = logging.getLogger(__name__)

SUPPORTED_FORMATS = ("csv", "json")

PathLike = Union[str, Path]


class ExporterError(Exception):
    """Raised when data cannot be serialized or written."""


def serialize(frame: pd.DataFrame, fmt: str) -> str:
    """Return ``frame`` serialized as a string in the given format."""
    fmt = fmt.lower()
    if fmt == "csv":
        return frame.to_csv(index=False)
    if fmt == "json":
        return frame.to_json(orient="records", indent=2, force_ascii=False)
    valid = ", ".join(SUPPORTED_FORMATS)
    raise ExporterError(f"Unsupported export format '{fmt}'. Use one of: {valid}.")


def export_data(
    frame: pd.DataFrame, output_path: PathLike, fmt: Optional[str] = None
) -> Path:
    """Write ``frame`` to ``output_path``.

    The format is taken from ``fmt`` or, when omitted, inferred from the file
    extension. Returns the path that was written.
    """
    path = Path(output_path)
    resolved_fmt = (fmt or path.suffix.lstrip(".")).lower()
    if not resolved_fmt:
        raise ExporterError(
            f"Cannot infer export format from '{path}'. "
            f"Add a .csv/.json extension or pass an explicit format."
        )

    content = serialize(frame, resolved_fmt)  # validates the format

    try:
        if path.parent != Path(""):
            path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    except OSError as exc:
        message = f"Could not write to '{path}': {exc}."
        logger.error(message)
        raise ExporterError(message) from exc

    logger.info(
        "Exported %d rows to '%s' as %s.", len(frame), path, resolved_fmt.upper()
    )
    return path
