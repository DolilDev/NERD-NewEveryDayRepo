# CSV Data Assistant

A small Python application for working with CSV files. It loads a CSV (with
automatic delimiter detection), lets you **filter**, **sort** and **aggregate**
the data, and exports the result to **CSV** or **JSON**. It ships with two
interfaces: a command-line tool and a Flask web app.

## Features

- **Loading** — reads CSV files with automatic **delimiter** detection (comma
  `,`, semicolon `;`, and tab) and automatic **encoding** detection (UTF-8 with
  a Latin-1 fallback). Validates the file (exists, non-empty, sane headers, and
  every row has the same column count) and reports problems with readable
  messages instead of raw tracebacks.
- **Processing**
  - `filter` rows by a condition: `==`, `!=`, `>`, `<` (plus `>=`, `<=`),
  - `sort` rows by any column, ascending or descending,
  - `aggregate` a column: `sum`, `mean`/`average`, `min`, `max`, `count`.
- **Export** — save the processed table as CSV or JSON.
- **Two interfaces** — an `argparse` CLI and a Flask web UI with file upload,
  an HTML results table, and CSV/JSON download.
- **Logging** — every user operation (load, filter, sort, aggregate, export) is
  logged to both the console and an `app.log` file.
- **Error handling** — each module raises a dedicated, user-friendly error
  (`LoaderError`, `ProcessorError`, `ExporterError`).

## Tech stack

- **Python 3.10+**
- **pandas** — data loading and processing
- **Flask** — web interface
- **pytest** — unit tests
- Standard library: `argparse`, `csv`, `logging`

## Project structure

```
.
├── src/
│   ├── loader.py          # read & validate CSV, auto-detect delimiter
│   ├── processor.py       # filter_rows / sort_rows / aggregate
│   ├── exporter.py        # serialize / export to CSV or JSON
│   ├── cli.py             # argparse command-line interface
│   └── logging_config.py  # shared console + file logging
├── web/
│   ├── app.py             # Flask app (upload, process, download)
│   └── templates/         # HTML templates
├── tests/                 # pytest unit tests for every module
├── sample_data.csv        # example dataset
└── requirements.txt
```

## Architecture

The code is split into single-responsibility modules. Data always flows in one
direction: **load → process → (display | export)**. Both front-ends — the CLI
and the Flask web app — reuse the exact same `src/` modules, so the two
interfaces behave identically.

```
            ┌──────────────┐        ┌──────────────┐
  CSV file  │  loader.py   │ frame  │ processor.py │ result
 ──────────▶│ read+detect  │───────▶│ filter/sort/ │───────┐
            │ +validate    │        │ aggregate    │       │
            └──────────────┘        └──────────────┘       ▼
                   ▲                                 ┌──────────────┐
                   │                                 │ exporter.py  │
            ┌──────┴───────┐  call modules           │ CSV / JSON   │
            │ cli.py /     │◀───────────────────────▶└──────────────┘
            │ web/app.py   │  (two front-ends)
            └──────────────┘
                   │ logs
                   ▼
          logging_config.py ──▶ console + app.log
```

| Module | Responsibility | Key API |
| ------ | -------------- | ------- |
| `src/loader.py` | Read a CSV into a `DataFrame`. Auto-detects the delimiter and encoding, validates the file, and raises `LoaderError` on any problem. | `load_csv()`, `detect_delimiter()`, `detect_encoding()` |
| `src/processor.py` | Pure transformations on the `DataFrame` (no I/O). Raises `ProcessorError` for bad columns/operators/types. | `filter_rows()`, `sort_rows()`, `aggregate()` |
| `src/exporter.py` | Serialize a `DataFrame` to CSV/JSON, as a string (web download) or to disk (CLI). Raises `ExporterError`. | `serialize()`, `export_data()` |
| `src/cli.py` | `argparse` front-end. Parses arguments, calls loader → processor → exporter, prints results, turns errors into clean messages + exit codes. | `main()`, `build_parser()` |
| `web/app.py` | Flask front-end. Handles upload → process → HTML table → CSV/JSON download, with flash messages and error handlers (404/413/500). | `create_app()` |
| `src/logging_config.py` | Shared logging setup so every module logs user operations to both the console and `app.log`. | `configure_logging()` |

**How they connect:** `loader` produces a `DataFrame`; `processor` consumes and
returns a transformed `DataFrame`; `exporter` serializes it. `cli.py` and
`web/app.py` are thin orchestration layers that wire these three together and
present the result. `logging_config.py` is shared infrastructure used by all of
them. Each layer raises its own exception type, and the front-ends catch those
to show readable messages instead of tracebacks.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Usage — CLI

Run as a module from the project root. Each sub-command takes a `--file`/`-f`
and a `--column`/`-c`.

```bash
# Filter: rows where salary > 9000
python -m src.cli filter -f sample_data.csv -c salary --op ">" --value 9000

# Sort: by age, descending, and export the result to JSON
python -m src.cli sort -f sample_data.csv -c age --order desc -o sorted.json

# Aggregate: average salary
python -m src.cli aggregate -f sample_data.csv -c salary --operation mean
```

Useful flags:

- `--delimiter` — force a delimiter instead of auto-detecting it.
- `-o/--output` — write the result to a file (`filter`/`sort`).
- `--format {csv,json}` — export format (otherwise inferred from the extension).

Full help: `python -m src.cli --help` (or `python -m src.cli filter --help`).

## Usage — Web

```bash
python web/app.py
# then open http://127.0.0.1:5000
```

In the browser: upload a CSV, choose an operation and its parameters, view the
result as a table, and download it as CSV or JSON.

## Running tests

```bash
pytest
```

The suite covers correct loading, missing/empty/invalid files, filtering,
sorting, aggregation, export, the CLI, and the web endpoints.

## Logging

All operations are logged to the console and appended to `app.log` in the
project root, e.g.:

```
2026-06-09 11:00:38,236 | INFO     | src.loader    | Loaded 10 rows and 6 columns from 'sample_data.csv'.
2026-06-09 11:00:38,237 | INFO     | src.processor | Filtered on 'salary' > '9000': 5 of 10 rows kept.
```
