"""Data loading module.

Responsible for reading CSV files into a :class:`pandas.DataFrame` with:

* automatic delimiter detection (supports at least comma ``,`` and semicolon
  ``;`` separated files),
* validation (file exists, is a regular file, is not empty, headers are sane),
* readable error handling — every failure is raised as :class:`LoaderError`
  carrying a human-friendly message instead of a raw traceback.
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Optional, Union

import pandas as pd

logger = logging.getLogger(__name__)

# Delimiters the loader is able to auto-detect.
SUPPORTED_DELIMITERS = [",", ";", "\t"]

PathLike = Union[str, Path]


class LoaderError(Exception):
    """Raised when a CSV file cannot be loaded or fails validation.

    The message is always user-facing and safe to print directly.
    """


def detect_delimiter(file_path: Path) -> str:
    """Guess the delimiter used by ``file_path``.

    Uses :class:`csv.Sniffer` first and falls back to counting candidate
    delimiters on the header line. Defaults to a comma when the file looks like
    a single-column file.
    """
    with file_path.open("r", encoding="utf-8", newline="") as handle:
        sample = handle.read(8192)

    if not sample.strip():
        raise LoaderError(f"File is empty: '{file_path}'.")

    try:
        dialect = csv.Sniffer().sniff(sample, delimiters="".join(SUPPORTED_DELIMITERS))
        if dialect.delimiter in SUPPORTED_DELIMITERS:
            return dialect.delimiter
    except csv.Error:
        # Sniffer is heuristic and may fail on small/edge samples; fall through.
        pass

    first_line = sample.splitlines()[0]
    counts = {delim: first_line.count(delim) for delim in SUPPORTED_DELIMITERS}
    best = max(counts, key=counts.get)
    # No candidate delimiter found -> treat as a single-column comma file.
    return best if counts[best] > 0 else ","


def load_csv(file_path: PathLike, delimiter: Optional[str] = None) -> pd.DataFrame:
    """Load a CSV file into a :class:`pandas.DataFrame`.

    Parameters
    ----------
    file_path:
        Path to the CSV file.
    delimiter:
        Force a specific delimiter. When ``None`` (default) it is auto-detected.

    Raises
    ------
    LoaderError
        If the file is missing, not a file, empty, badly formatted or has
        invalid headers.
    """
    path = Path(file_path)

    if not path.exists():
        message = f"File not found: '{path}'."
        logger.error(message)
        raise LoaderError(message)

    if not path.is_file():
        message = f"Path is not a file: '{path}'."
        logger.error(message)
        raise LoaderError(message)

    if path.stat().st_size == 0:
        message = f"File is empty: '{path}'."
        logger.error(message)
        raise LoaderError(message)

    if delimiter is None:
        delimiter = detect_delimiter(path)
        logger.info("Auto-detected delimiter %r for '%s'.", delimiter, path)

    try:
        frame = pd.read_csv(path, sep=delimiter)
    except pd.errors.EmptyDataError as exc:
        message = f"File contains no parsable data: '{path}'."
        logger.error(message)
        raise LoaderError(message) from exc
    except pd.errors.ParserError as exc:
        message = f"Could not parse CSV '{path}': malformed rows ({exc})."
        logger.error(message)
        raise LoaderError(message) from exc
    except UnicodeDecodeError as exc:
        message = f"File '{path}' is not valid UTF-8 text."
        logger.error(message)
        raise LoaderError(message) from exc

    _validate_headers(frame, path)

    if frame.empty:
        logger.warning("File '%s' has headers but no data rows.", path)

    logger.info(
        "Loaded %d rows and %d columns from '%s'.",
        len(frame),
        frame.shape[1],
        path,
    )
    return frame


def _validate_headers(frame: pd.DataFrame, path: Path) -> None:
    """Ensure the header row is meaningful.

    pandas names missing/blank headers ``Unnamed: N``; reject those so the user
    gets a clear message instead of confusing column names downstream.
    """
    if frame.shape[1] == 0:
        message = f"File '{path}' has no columns / header row."
        logger.error(message)
        raise LoaderError(message)

    bad_headers = [
        str(col)
        for col in frame.columns
        if str(col).strip() == "" or str(col).startswith("Unnamed:")
    ]
    if bad_headers:
        message = (
            f"File '{path}' has missing or blank column headers: "
            f"{', '.join(bad_headers)}. Make sure the first row contains names."
        )
        logger.error(message)
        raise LoaderError(message)
