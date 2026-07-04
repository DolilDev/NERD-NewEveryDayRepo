"""Centralized logging configuration.

All modules obtain their own logger with ``logging.getLogger(__name__)`` and
share the handlers configured here. Logs are written both to the console and to
an ``app.log`` file, as required by the project specification.
"""

from __future__ import annotations

import logging
from pathlib import Path

LOG_FILE = Path(__file__).resolve().parent.parent / "app.log"
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

_configured = False


def configure_logging(level: int = logging.INFO, log_file: Path | str = LOG_FILE) -> None:
    """Configure the root logger once (idempotent).

    Attaches a console handler and a file handler. Calling this multiple times
    has no additional effect, which keeps CLI, web and tests from duplicating
    handlers (and therefore log lines).
    """
    global _configured
    if _configured:
        return

    formatter = logging.Formatter(LOG_FORMAT)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(console_handler)
    root.addHandler(file_handler)

    _configured = True
