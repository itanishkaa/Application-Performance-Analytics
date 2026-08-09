"""
Cleaning & normalization service.

This is a direct port of the rules already implemented and validated in
legacy/Cleaned_Data_using_SQL.sql (see PRD section 9), rewritten in pandas
so the same logic can run against any SQL backend without relying on
MySQL-specific SQL (LOAD DATA LOCAL INFILE, etc.) that doesn't translate to
SQLite.

Rules (PRD 9.1 - 9.7):
  9.1 status_code must be between 200 and 599 (drop NULL / out of range)
  9.2 response_time_ms must be > 0 (drop NULL / 0 / negative)
  9.3 endpoint: lowercase, trim, strip trailing slash; missing -> "unknown-endpoint"
  9.4 service_name: missing -> "unknown-service"
  9.5 release_version: missing -> "unknown"
  9.6 server_region: missing -> "unknown"
  9.7 duplicates removed (equivalent to SELECT DISTINCT)
"""
from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class CleaningReport:
    raw_rows: int
    clean_rows: int
    dropped_invalid_status: int
    dropped_invalid_latency: int
    duplicates_removed: int
    unknown_endpoint_count: int
    unknown_service_count: int


def _normalize_endpoint(value) -> str:
    if pd.isna(value) or str(value).strip() == "":
        return "unknown-endpoint"
    normalized = str(value).strip().lower()
    if normalized != "/" and normalized.endswith("/"):
        normalized = normalized.rstrip("/")
    return normalized


def clean_dataframe(raw_df: pd.DataFrame) -> tuple[pd.DataFrame, CleaningReport]:
    df = raw_df.copy()
    raw_rows = len(df)

    # Coerce types up front so comparisons behave predictably.
    df["status_code"] = pd.to_numeric(df["status_code"], errors="coerce")
    df["response_time_ms"] = pd.to_numeric(df["response_time_ms"], errors="coerce")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    # --- 9.1 Status code validation ---
    invalid_status_mask = df["status_code"].isna() | ~df["status_code"].between(200, 599)
    dropped_invalid_status = int(invalid_status_mask.sum())
    df = df[~invalid_status_mask]

    # --- 9.2 Response time validation ---
    invalid_latency_mask = df["response_time_ms"].isna() | (df["response_time_ms"] <= 0)
    dropped_invalid_latency = int(invalid_latency_mask.sum())
    df = df[~invalid_latency_mask]

    # Drop rows where the timestamp itself failed to parse — these can't be
    # placed on any trend/time-series chart.
    df = df[df["timestamp"].notna()]

    # --- 9.3 Endpoint normalization ---
    df["endpoint"] = df["endpoint"].apply(_normalize_endpoint)
    unknown_endpoint_count = int((df["endpoint"] == "unknown-endpoint").sum())

    # --- 9.4 Service normalization ---
    df["service_name"] = df["service_name"].apply(
        lambda v: "unknown-service" if pd.isna(v) or str(v).strip() == "" else str(v).strip()
    )
    unknown_service_count = int((df["service_name"] == "unknown-service").sum())

    # --- 9.5 Release normalization ---
    df["release_version"] = df["release_version"].apply(
        lambda v: "unknown" if pd.isna(v) or str(v).strip() == "" else str(v).strip()
    )

    # --- 9.6 Region normalization ---
    df["server_region"] = df["server_region"].apply(
        lambda v: "unknown" if pd.isna(v) or str(v).strip() == "" else str(v).strip()
    )

    df["status_code"] = df["status_code"].astype(int)
    df["response_time_ms"] = df["response_time_ms"].astype(int)

    # --- 9.7 Duplicate removal ---
    before_dedup = len(df)
    df = df.drop_duplicates()
    duplicates_removed = before_dedup - len(df)

    report = CleaningReport(
        raw_rows=raw_rows,
        clean_rows=len(df),
        dropped_invalid_status=dropped_invalid_status,
        dropped_invalid_latency=dropped_invalid_latency,
        duplicates_removed=duplicates_removed,
        unknown_endpoint_count=unknown_endpoint_count,
        unknown_service_count=unknown_service_count,
    )

    return df.reset_index(drop=True), report
