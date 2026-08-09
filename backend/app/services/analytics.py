"""
Analytics engine.

These functions are the reusable core referenced in PRD section 50. They
all take a pandas DataFrame of *cleaned* api_logs rows (same shape as the
ApiLog model / api_logs_clean table) and a set of optional filters, and
return plain dict/DataFrame results that the API routes serialize into
Pydantic response models.

Deliberately kept as pure functions (no DB session, no FastAPI) so they can
be unit tested directly and reused by the AI context builder without going
through HTTP.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

SLOW_REQUEST_DEFAULT_THRESHOLD_MS = 1000


def apply_filters(
    df: pd.DataFrame,
    service: Optional[str] = None,
    endpoint: Optional[str] = None,
    release: Optional[str] = None,
    region: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> pd.DataFrame:
    out = df
    if service:
        out = out[out["service_name"] == service]
    if endpoint:
        out = out[out["endpoint"] == endpoint]
    if release:
        out = out[out["release_version"] == release]
    if region:
        out = out[out["server_region"] == region]
    if date_from:
        out = out[out["timestamp"] >= pd.to_datetime(date_from)]
    if date_to:
        out = out[out["timestamp"] <= pd.to_datetime(date_to)]
    return out


def calculate_error_rate(df: pd.DataFrame) -> float:
    if len(df) == 0:
        return 0.0
    return float((df["status_code"] >= 400).mean() * 100)


def calculate_percentiles(df: pd.DataFrame) -> dict:
    if len(df) == 0:
        return {"avg": 0.0, "p50": 0.0, "p95": 0.0, "p99": 0.0, "max": 0.0}
    lat = df["response_time_ms"]
    return {
        "avg": float(lat.mean()),
        "p50": float(lat.quantile(0.50)),
        "p95": float(lat.quantile(0.95)),
        "p99": float(lat.quantile(0.99)),
        "max": float(lat.max()),
    }


def calculate_latency_metrics(df: pd.DataFrame) -> dict:
    """Alias/expansion of calculate_percentiles with naming matched to the
    KPI card fields in the Dashboard (PRD section 11)."""
    p = calculate_percentiles(df)
    return {
        "avg_latency_ms": p["avg"],
        "p95_latency_ms": p["p95"],
        "p99_latency_ms": p["p99"],
        "max_latency_ms": p["max"],
    }


def calculate_kpis(df: pd.DataFrame, slow_threshold_ms: int = SLOW_REQUEST_DEFAULT_THRESHOLD_MS) -> dict:
    """PRD section 11 — Dashboard KPI cards."""
    total_requests = len(df)
    latency = calculate_latency_metrics(df)
    error_rate = calculate_error_rate(df)
    slow_requests = int((df["response_time_ms"] > slow_threshold_ms).sum()) if total_requests else 0
    active_services = int(df["service_name"].nunique()) if total_requests else 0
    failed_requests = int((df["status_code"] >= 400).sum()) if total_requests else 0
    error_4xx = (
        float(((df["status_code"] >= 400) & (df["status_code"] < 500)).mean() * 100) if total_requests else 0.0
    )
    error_5xx = float((df["status_code"] >= 500).mean() * 100) if total_requests else 0.0

    return {
        "total_requests": total_requests,
        "error_rate_percent": round(error_rate, 2),
        "avg_latency_ms": round(latency["avg_latency_ms"], 2),
        "p95_latency_ms": round(latency["p95_latency_ms"], 2),
        "p99_latency_ms": round(latency["p99_latency_ms"], 2),
        "availability_percent": round(100 - error_rate, 2),
        "slow_requests": slow_requests,
        "active_services": active_services,
        "failed_requests": failed_requests,
        "error_rate_4xx_percent": round(error_4xx, 2),
        "error_rate_5xx_percent": round(error_5xx, 2),
    }


def calculate_period_comparison(df: pd.DataFrame) -> dict:
    """Splits the currently-loaded time range in half and compares error
    rate / avg latency between the two halves, so the dashboard can show a
    simple "vs previous period" trend indicator (PRD section 11) without
    requiring an explicit date-range picker.
    """
    empty_result = {"error_rate_change_points": 0.0, "avg_latency_change_percent": 0.0}
    if len(df) == 0:
        return empty_result

    sorted_df = df.sort_values("timestamp")
    min_ts, max_ts = sorted_df["timestamp"].min(), sorted_df["timestamp"].max()
    if min_ts == max_ts:
        return empty_result

    midpoint = min_ts + (max_ts - min_ts) / 2
    previous = sorted_df[sorted_df["timestamp"] < midpoint]
    current = sorted_df[sorted_df["timestamp"] >= midpoint]
    if len(previous) == 0 or len(current) == 0:
        return empty_result

    prev_error, curr_error = calculate_error_rate(previous), calculate_error_rate(current)
    prev_avg = calculate_percentiles(previous)["avg"]
    curr_avg = calculate_percentiles(current)["avg"]

    return {
        "error_rate_change_points": round(curr_error - prev_error, 2),
        "avg_latency_change_percent": round(_pct_change(prev_avg, curr_avg), 2),
    }


def latency_trend(df: pd.DataFrame) -> pd.DataFrame:
    """Daily avg/p95/p99/max latency — PRD section 12."""
    if len(df) == 0:
        return pd.DataFrame(
            columns=["date", "avg_latency_ms", "p95_latency_ms", "p99_latency_ms", "max_latency_ms"]
        )

    grouped = df.assign(date=df["timestamp"].dt.date).groupby("date")["response_time_ms"]
    result = grouped.agg(
        avg_latency_ms="mean",
        p95_latency_ms=lambda s: s.quantile(0.95),
        p99_latency_ms=lambda s: s.quantile(0.99),
        max_latency_ms="max",
    ).reset_index()
    return result.round(2)


def analyze_endpoint_performance(df: pd.DataFrame) -> pd.DataFrame:
    """PRD section 16 — Endpoint Explorer table."""
    if len(df) == 0:
        return pd.DataFrame(
            columns=[
                "endpoint", "service_name", "requests", "avg_latency_ms",
                "p95_latency_ms", "p99_latency_ms", "error_rate_percent", "status",
            ]
        )

    grouped = df.groupby(["endpoint", "service_name"])
    result = grouped.agg(
        requests=("response_time_ms", "count"),
        avg_latency_ms=("response_time_ms", "mean"),
        p95_latency_ms=("response_time_ms", lambda s: s.quantile(0.95)),
        p99_latency_ms=("response_time_ms", lambda s: s.quantile(0.99)),
        error_rate_percent=("status_code", lambda s: (s >= 400).mean() * 100),
    ).reset_index()

    result["status"] = result.apply(_status_from_metrics, axis=1)
    return result.round(2)


def analyze_release_performance(df: pd.DataFrame) -> pd.DataFrame:
    """PRD section 20 — Release comparison table."""
    if len(df) == 0:
        return pd.DataFrame(
            columns=["release_version", "requests", "avg_latency_ms", "p95_latency_ms",
                     "p99_latency_ms", "error_rate_percent"]
        )

    grouped = df.groupby("release_version")
    result = grouped.agg(
        requests=("response_time_ms", "count"),
        avg_latency_ms=("response_time_ms", "mean"),
        p95_latency_ms=("response_time_ms", lambda s: s.quantile(0.95)),
        p99_latency_ms=("response_time_ms", lambda s: s.quantile(0.99)),
        error_rate_percent=("status_code", lambda s: (s >= 400).mean() * 100),
    ).reset_index()
    return result.round(2)


def detect_regressions(release_perf: pd.DataFrame, release_order: list[str]) -> pd.DataFrame:
    """PRD section 21 — deterministic release-over-release comparison.

    `release_order` should be chronological (oldest -> newest), e.g.
    ["v1.0", "v1.1", "v2.0"]. Unknown releases not in release_perf are
    skipped.
    """
    rows = []
    ordered = [r for r in release_order if r in set(release_perf["release_version"])]

    for i, release in enumerate(ordered):
        current = release_perf[release_perf["release_version"] == release].iloc[0]
        if i == 0:
            rows.append({
                "release_version": release,
                "previous_release_version": None,
                "avg_latency_change_percent": 0.0,
                "p95_latency_change_percent": 0.0,
                "error_rate_change_points": 0.0,
                "is_regression": False,
            })
            continue

        previous_name = ordered[i - 1]
        previous = release_perf[release_perf["release_version"] == previous_name].iloc[0]

        avg_change = _pct_change(previous["avg_latency_ms"], current["avg_latency_ms"])
        p95_change = _pct_change(previous["p95_latency_ms"], current["p95_latency_ms"])
        error_change = current["error_rate_percent"] - previous["error_rate_percent"]

        is_regression = avg_change > 20 or p95_change > 20 or error_change > 1.0

        rows.append({
            "release_version": release,
            "previous_release_version": previous_name,
            "avg_latency_change_percent": round(avg_change, 2),
            "p95_latency_change_percent": round(p95_change, 2),
            "error_rate_change_points": round(error_change, 2),
            "is_regression": bool(is_regression),
        })

    return pd.DataFrame(rows)


def analyze_region_performance(df: pd.DataFrame) -> pd.DataFrame:
    """PRD section 22 — Regional analysis."""
    if len(df) == 0:
        return pd.DataFrame(
            columns=["server_region", "requests", "avg_latency_ms", "p95_latency_ms",
                     "error_rate_percent", "availability_percent"]
        )

    grouped = df.groupby("server_region")
    result = grouped.agg(
        requests=("response_time_ms", "count"),
        avg_latency_ms=("response_time_ms", "mean"),
        p95_latency_ms=("response_time_ms", lambda s: s.quantile(0.95)),
        error_rate_percent=("status_code", lambda s: (s >= 400).mean() * 100),
    ).reset_index()
    result["availability_percent"] = 100 - result["error_rate_percent"]
    return result.round(2)


def detect_outliers(df: pd.DataFrame, method: str = "p99") -> tuple[pd.DataFrame, Optional[float]]:
    """PRD section 19 — three interchangeable outlier-detection methods,
    ported directly from legacy/legacy_python_analysis.py.

    Returns (outlier_rows, threshold). threshold is None for the z-score
    method, since it isn't expressed as a single latency cutoff.
    """
    if len(df) == 0:
        return df, None

    if method == "iqr":
        q1 = df["response_time_ms"].quantile(0.25)
        q3 = df["response_time_ms"].quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outliers = df[(df["response_time_ms"] < lower) | (df["response_time_ms"] > upper)]
        return outliers, float(upper)

    if method == "zscore":
        std = df["response_time_ms"].std()
        if std == 0 or pd.isna(std):
            return df.iloc[0:0], None
        z = (df["response_time_ms"] - df["response_time_ms"].mean()) / std
        outliers = df[z.abs() > 3]
        return outliers, None

    # default: p99
    p99 = df["response_time_ms"].quantile(0.99)
    outliers = df[df["response_time_ms"] > p99]
    return outliers, float(p99)


def calculate_reliability_score(latency_p95_ms: float, error_rate_percent: float,
                                 baseline_p95_ms: float = 1500.0) -> dict:
    """PRD section 51 — normalized component scores combined into a single
    0-100 reliability score, instead of exposing the raw legacy formula
    (avg_latency * 0.6 + error_rate * 0.4) whose units don't mix cleanly.
    """
    latency_score = float(np.clip(100 - (latency_p95_ms / max(baseline_p95_ms, 1)) * 100, 0, 100))
    error_score = float(np.clip(100 - error_rate_percent * 10, 0, 100))
    availability_score = float(np.clip(100 - error_rate_percent, 0, 100))

    # Simple weighted blend; documented here per PRD section 51 note that
    # final weighting should be finalized during implementation.
    overall = round(latency_score * 0.4 + error_score * 0.4 + availability_score * 0.2, 1)

    status = "Healthy"
    if overall < 60:
        status = "Critical"
    elif overall < 85:
        status = "Degraded"

    return {
        "latency_score": round(latency_score, 1),
        "error_score": round(error_score, 1),
        "availability_score": round(availability_score, 1),
        "overall_score": overall,
        "status": status,
    }


def _status_from_metrics(row) -> str:
    if row["error_rate_percent"] > 5 or row["p95_latency_ms"] > 2000:
        return "Critical"
    if row["error_rate_percent"] > 2 or row["p95_latency_ms"] > 1000:
        return "Degraded"
    return "Healthy"


def _pct_change(old: float, new: float) -> float:
    if old == 0:
        return 0.0
    return ((new - old) / old) * 100
