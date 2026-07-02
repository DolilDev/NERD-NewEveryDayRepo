"""Data loading module.

Responsible for reading CSV files into a :class:`pandas.DataFrame` with:

* automatic delimiter detection (supports at least comma ``,`` and semicolon
  ``;`` separated files, plus tab),
* automatic encoding detection (UTF-8 with a Latin-1 fallback),
* validation: file exists, is a regular file, is not empty, has sane headers,
  and every data row has the same number of columns as the header,
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

# Encodings tried in order. Latin-1 maps every byte, so it acts as a safety net
# for files that are not valid UTF-8 (e.g. legacy Windows/Excel exports).
SUPPORTED_ENCODINGS = ["utf-8", "latin-1"]

PathLike = Union[str, Path]


class LoaderError(Exception):
    """Raised when a CSV file cannot be loaded or fails validation.

    The message is always user-facing and safe to print directly.
    """


def detect_encoding(file_path: Path) -> str:
    """Return the first encoding from :data:`SUPPORTED_ENCODINGS` that decodes
    the file. Reads the raw bytes once and tries each encoding."""
    raw = file_path.read_bytes()
    for encoding in SUPPORTED_ENCODINGS:
        try:
            raw.decode(encoding)
            return encoding
        except UnicodeDecodeError:
            continue
    # latin-1 decodes any byte sequence, so we normally never get here.
    return SUPPORTED_ENCODINGS[-1]


def detect_delimiter(file_path: Path, encoding: str = "utf-8") -> str:
    """Guess the delimiter used by ``file_path``.

    Uses :class:`csv.Sniffer` first and falls back to counting candidate
    delimiters on the header line. Defaults to a comma when the file looks like
    a single-column file.
    """
    with file_path.open("r", encoding=encoding, newline="") as handle:
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


def load_csv(
    file_path: PathLike,
    delimiter: Optional[str] = None,
    encoding: Optional[str] = None,
) -> pd.DataFrame:
    """Load a CSV file into a :class:`pandas.DataFrame`.

    Parameters
    ----------
    file_path:
        Path to the CSV file.
    delimiter:
        Force a specific delimiter. When ``None`` (default) it is auto-detected.
    encoding:
        Force a specific encoding. When ``None`` (default) it is auto-detected
        (UTF-8 first, then Latin-1).

    Raises
    ------
    LoaderError
        If the file is missing, not a file, empty, badly formatted, has invalid
        headers or rows with an inconsistent number of columns.
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

    if encoding is None:
        encoding = detect_encoding(path)
        if encoding != "utf-8":
            logger.warning("File '%s' is not UTF-8; using '%s'.", path, encoding)

    if delimiter is None:
        delimiter = detect_delimiter(path, encoding)
        logger.info("Auto-detected delimiter %r for '%s'.", delimiter, path)

    # Explicit, friendly check for ragged rows before handing off to pandas.
    _validate_row_lengths(path, delimiter, encoding)

    try:
        frame = pd.read_csv(path, sep=delimiter, encoding=encoding)
    except pd.errors.EmptyDataError as exc:
        message = f"File contains no parsable data: '{path}'."
        logger.error(message)
        raise LoaderError(message) from exc
    except pd.errors.ParserError as exc:
        message = f"Could not parse CSV '{path}': malformed rows ({exc})."
        logger.error(message)
        raise LoaderError(message) from exc
    except UnicodeDecodeError as exc:
        message = f"File '{path}' could not be decoded as {encoding}."
        logger.error(message)
        raise LoaderError(message) from exc

    _validate_headers(frame, path)

    if frame.empty:
        logger.warning("File '%s' has headers but no data rows.", path)

    logger.info(
        "Loaded %d rows and %d columns from '%s' (delimiter=%r, encoding=%s).",
        len(frame),
        frame.shape[1],
        path,
        delimiter,
        encoding,
    )
    return frame


def _validate_row_lengths(path: Path, delimiter: str, encoding: str) -> None:
    """Ensure every data row has the same field count as the header.

    pandas silently pads short rows with ``NaN`` and only raises on *extra*
    fields, so we validate explicitly to give a clear, located error message.
    """
    with path.open("r", encoding=encoding, newline="") as handle:
        reader = csv.reader(handle, delimiter=delimiter)
        header_len: Optional[int] = None
        for line_no, row in enumerate(reader, start=1):
            if not row:  # skip blank lines (pandas ignores them too)
                continue
            if header_len is None:
                header_len = len(row)
                continue
            if len(row) != header_len:
                message = (
                    f"Inconsistent number of columns in '{path}': row {line_no} "
                    f"has {len(row)} field(s) but the header has {header_len}."
                )
                logger.error(message)
                raise LoaderError(message)


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
