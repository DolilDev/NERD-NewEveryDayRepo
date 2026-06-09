"""Command-line interface.

Three sub-commands operate on a CSV file:

* ``filter``    — keep rows where ``column <op> value``,
* ``sort``      — order rows by a column, ascending or descending,
* ``aggregate`` — reduce a column (sum/mean/min/max/count).

``filter`` and ``sort`` can additionally export their result with ``--output``.

Examples
--------
    python -m src.cli filter -f sample_data.csv -c salary --op ">" --value 9000
    python -m src.cli sort -f sample_data.csv -c age --order desc -o sorted.json
    python -m src.cli aggregate -f sample_data.csv -c salary --operation mean
"""

from __future__ import annotations

import argparse
import logging
import sys
from typing import Optional, Sequence

from .exporter import ExporterError, export_data
from .loader import LoaderError, load_csv
from .logging_config import configure_logging
from .processor import (
    AGGREGATIONS,
    OPERATORS,
    ProcessorError,
    aggregate,
    filter_rows,
    sort_rows,
)

logger = logging.getLogger(__name__)


def build_parser() -> argparse.ArgumentParser:
    """Construct the argparse parser with all sub-commands."""
    parser = argparse.ArgumentParser(
        prog="csv-assistant",
        description="Load, process and export CSV files.",
    )

    # Shared: input file + optional forced delimiter.
    file_parent = argparse.ArgumentParser(add_help=False)
    file_parent.add_argument("-f", "--file", required=True, help="Path to the CSV file.")
    file_parent.add_argument(
        "--delimiter", help="Force a delimiter (default: auto-detect)."
    )

    # Shared: optional export of the resulting table.
    output_parent = argparse.ArgumentParser(add_help=False)
    output_parent.add_argument(
        "-o", "--output", help="Write the result to this CSV/JSON file."
    )
    output_parent.add_argument(
        "--format", choices=("csv", "json"), help="Export format (default: by extension)."
    )

    sub = parser.add_subparsers(dest="command", required=True)

    p_filter = sub.add_parser(
        "filter", parents=[file_parent, output_parent], help="Filter rows by a condition."
    )
    p_filter.add_argument("-c", "--column", required=True, help="Column to filter on.")
    p_filter.add_argument(
        "--op", required=True, choices=list(OPERATORS), help="Comparison operator."
    )
    p_filter.add_argument("--value", required=True, help="Value to compare against.")

    p_sort = sub.add_parser(
        "sort", parents=[file_parent, output_parent], help="Sort rows by a column."
    )
    p_sort.add_argument("-c", "--column", required=True, help="Column to sort by.")
    p_sort.add_argument(
        "--order", choices=("asc", "desc"), default="asc", help="Sort order (default: asc)."
    )

    p_agg = sub.add_parser(
        "aggregate", parents=[file_parent], help="Aggregate a single column."
    )
    p_agg.add_argument("-c", "--column", required=True, help="Column to aggregate.")
    p_agg.add_argument(
        "--operation",
        required=True,
        choices=list(AGGREGATIONS),
        help="Aggregation to apply.",
    )

    return parser


def _print_table(frame) -> None:
    if frame.empty:
        print("(no rows matched)")
    else:
        print(frame.to_string(index=False))


def main(argv: Optional[Sequence[str]] = None) -> int:
    """Entry point. Returns a process exit code (0 = success, 1 = error)."""
    configure_logging()
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        frame = load_csv(args.file, args.delimiter)

        if args.command == "filter":
            result = filter_rows(frame, args.column, args.op, args.value)
            _print_table(result)
            _maybe_export(result, args)
        elif args.command == "sort":
            result = sort_rows(frame, args.column, ascending=args.order == "asc")
            _print_table(result)
            _maybe_export(result, args)
        elif args.command == "aggregate":
            value = aggregate(frame, args.column, args.operation)
            print(f"{args.operation}({args.column}) = {value}")
    except (LoaderError, ProcessorError, ExporterError) as exc:
        # Modules already logged the technical detail; show a clean message.
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    return 0


def _maybe_export(result, args) -> None:
    if getattr(args, "output", None):
        path = export_data(result, args.output, args.format)
        print(f"\nSaved {len(result)} rows to {path}")


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
