"""
Incident detection.

Deterministic rules per PRD section 26 — no ML. Each rule inspects
per-service metrics (computed over the requested window) against
configurable thresholds from app.core.config.settings and produces
Incident rows to persist.

This module returns plain dicts (not ORM objects) so it can be unit
tested without a DB session; the API route is responsible for turning
these into Incident rows.
"""
from __future__ import annotations

from typing import Optional

import pandas as pd

from app.core.config import settings
from app.services.analytics import (
    analyze_endpoint_performance,
    calculate_error_rate,
    calculate_percentiles,
)


def detect_incidents(
    df: pd.DataFrame,
    error_rate_threshold_percent: Optional[float] = None,
    p95_latency_threshold_ms: Optional[float] = None,
    latency_regression_multiplier: Optional[float] = None,
    baseline_df: Optional[pd.DataFrame] = None,
) -> list[dict]:
    """Evaluate the deterministic rules per service and return a list of
    incident dicts: {title, severity, service, trigger_type, description}.

    `baseline_df` (optional) is an earlier time window used for the
    "sudden latency increase" rule; when omitted that rule is skipped.
    """
    error_threshold = error_rate_threshold_percent or settings.HIGH_ERROR_RATE_PERCENT
    p95_threshold = p95_latency_threshold_ms or settings.HIGH_LATENCY_P95_MS
    regression_multiplier = latency_regression_multiplier or settings.LATENCY_REGRESSION_MULTIPLIER

    incidents: list[dict] = []
    if len(df) == 0:
        return incidents

    for service_name, service_df in df.groupby("service_name"):
        error_rate = calculate_error_rate(service_df)
        percentiles = calculate_percentiles(service_df)

        affected_endpoints = (
            analyze_endpoint_performance(service_df)
            .sort_values("error_rate_percent", ascending=False)["endpoint"]
            .head(5)
            .tolist()
        )

        # --- High Error Rate ---
        if error_rate > error_threshold:
            incidents.append({
                "title": f"High Error Rate — {service_name}",
                "severity": "high" if error_rate > error_threshold * 2 else "medium",
                "service": service_name,
                "trigger_type": "high_error_rate",
                "description": (
                    f"Error rate {error_rate:.1f}% exceeds threshold {error_threshold:.1f}%. "
                    f"Affected endpoints: {', '.join(affected_endpoints) or 'n/a'}."
                ),
            })

        # --- High Latency (P95) ---
        if percentiles["p95"] > p95_threshold:
            incidents.append({
                "title": f"High API Latency — {service_name}",
                "severity": "high" if percentiles["p95"] > p95_threshold * 1.5 else "medium",
                "service": service_name,
                "trigger_type": "high_latency",
                "description": (
                    f"P95 latency {percentiles['p95']:.0f}ms exceeds threshold {p95_threshold:.0f}ms. "
                    f"Affected endpoints: {', '.join(affected_endpoints) or 'n/a'}."
                ),
            })

        # --- Sudden Latency Increase (requires baseline) ---
        if baseline_df is not None and len(baseline_df) > 0:
            baseline_service_df = baseline_df[baseline_df["service_name"] == service_name]
            if len(baseline_service_df) > 0:
                baseline_avg = calculate_percentiles(baseline_service_df)["avg"]
                current_avg = percentiles["avg"]
                if baseline_avg > 0 and current_avg > baseline_avg * regression_multiplier:
                    incidents.append({
                        "title": f"Sudden Latency Increase — {service_name}",
                        "severity": "high",
                        "service": service_name,
                        "trigger_type": "sudden_latency_increase",
                        "description": (
                            f"Average latency jumped from {baseline_avg:.0f}ms to "
                            f"{current_avg:.0f}ms (>{regression_multiplier}x baseline)."
                        ),
                    })

    return incidents
