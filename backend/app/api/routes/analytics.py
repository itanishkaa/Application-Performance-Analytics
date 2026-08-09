from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import KpiOverview, OutliersResponse, TrendsResponse
from app.services import analytics as analytics_service
from app.services import outliers as outliers_service
from app.services.data_access import load_logs_df

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=KpiOverview)
def get_overview(
    service: Optional[str] = None,
    endpoint: Optional[str] = None,
    release: Optional[str] = None,
    region: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service, endpoint, release, region, date_from, date_to)
    kpis = analytics_service.calculate_kpis(df)
    kpis.update(analytics_service.calculate_period_comparison(df))
    return kpis


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    service: Optional[str] = None,
    endpoint: Optional[str] = None,
    release: Optional[str] = None,
    region: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service, endpoint, release, region, date_from, date_to)
    trend_df = analytics_service.latency_trend(df)
    return {"points": trend_df.to_dict(orient="records")}


@router.get("/outliers", response_model=OutliersResponse)
def get_outliers(
    method: str = Query("p99", pattern="^(iqr|p99|zscore)$"),
    service: Optional[str] = None,
    endpoint: Optional[str] = None,
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=service, endpoint=endpoint)
    outlier_rows, threshold = outliers_service.get_outliers(df, method=method)

    records = outlier_rows.head(limit).copy()
    if len(records) > 0:
        records["timestamp"] = records["timestamp"].astype(str)

    return {
        "method": method,
        "threshold_ms": threshold,
        "outlier_count": len(outlier_rows),
        "outliers": records.to_dict(orient="records"),
    }
