"""
Thin wrapper around analytics.detect_outliers, kept as its own module
(per PRD section 54 folder structure) so the /analytics/outliers route
and the AI context builder both import from a stable, single-purpose
location rather than reaching into analytics.py directly.
"""
from __future__ import annotations

import pandas as pd

from app.services.analytics import detect_outliers

VALID_METHODS = {"iqr", "p99", "zscore"}


def get_outliers(df: pd.DataFrame, method: str = "p99") -> tuple[pd.DataFrame, float | None]:
    if method not in VALID_METHODS:
        raise ValueError(f"Unknown outlier method '{method}'. Must be one of {sorted(VALID_METHODS)}")
    return detect_outliers(df, method=method)
