"""
Loads cleaned api_logs rows out of SQLite into a pandas DataFrame so the
pure-function analytics engine (app.services.analytics) can operate on
them. Kept separate from analytics.py so that module has zero DB/ORM
dependency and stays trivially unit-testable.
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.api_log import ApiLog


def load_logs_df(db: Session, dataset_id: str | None = None) -> pd.DataFrame:
    query = select(
        ApiLog.id,
        ApiLog.timestamp,
        ApiLog.service_name,
        ApiLog.endpoint,
        ApiLog.status_code,
        ApiLog.response_time_ms,
        ApiLog.release_version,
        ApiLog.server_region,
        ApiLog.dataset_id,
    )
    if dataset_id:
        query = query.where(ApiLog.dataset_id == dataset_id)

    rows = db.execute(query).all()
    df = pd.DataFrame(rows, columns=[
        "id", "timestamp", "service_name", "endpoint", "status_code",
        "response_time_ms", "release_version", "server_region", "dataset_id",
    ])
    if len(df) > 0:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df
