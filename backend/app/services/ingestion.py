"""
Ingestion service.

Reads a raw CSV (matching the schema produced by
data/scripts/generate_synthetic_logs.py) into a pandas DataFrame, ready to
be handed to services.cleaning.clean_dataframe().

This intentionally does NOT write to the database itself — ingestion and
cleaning are kept as separate steps so each can be tested independently,
mirroring the PRD's pipeline: Raw Logs -> Ingestion -> Validation ->
Cleaning -> SQLite.
"""
from __future__ import annotations

import pandas as pd

REQUIRED_COLUMNS = [
    "timestamp",
    "service_name",
    "endpoint",
    "status_code",
    "response_time_ms",
    "release_version",
    "server_region",
]


class IngestionError(ValueError):
    pass


def read_raw_csv(path_or_buffer) -> pd.DataFrame:
    """Read a raw, uncleaned API-log CSV into a DataFrame.

    `path_or_buffer` can be a filesystem path (str) or a file-like object
    (e.g. an UploadFile.file from FastAPI), so this works for both the
    default dataset on disk and user-uploaded files.
    """
    df = pd.read_csv(path_or_buffer)

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise IngestionError(f"CSV is missing required columns: {missing}")

    return df[REQUIRED_COLUMNS].copy()
