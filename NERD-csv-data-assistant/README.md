# CSV Data Assistant

A small Python application for working with CSV files. It loads a CSV (with
automatic delimiter detection), lets you **filter**, **sort** and **aggregate**
the data, and exports the result to **CSV** or **JSON**. It ships with two
interfaces: a command-line tool and a Flask web app.

## Features

- **Loading** — reads CSV files with automatic delimiter detection (comma `,`,
  semicolon `;`, and tab), validates the file (exists, non-empty, sane headers)
  and reports problems with readable messages instead of raw tracebacks.
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

The design follows the three core modules required by the task — **loading**,
**processing** and a **user interface** (CLI) — extended with an **export**
module and a **Flask web** front-end.

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
