from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.endpoint import EndpointDetail, EndpointListResponse
from app.services import analytics as analytics_service
from app.services.data_access import load_logs_df

router = APIRouter(prefix="/endpoints", tags=["endpoints"])


@router.get("", response_model=EndpointListResponse)
def list_endpoints(
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=service)
    result = analytics_service.analyze_endpoint_performance(df)
    return {"endpoints": result.to_dict(orient="records")}

@router.get("/{endpoint_path:path}/performance")
def get_endpoint_performance(
    endpoint_path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Release/region/time breakdown for a single endpoint (PRD section 17)."""
    df = load_logs_df(db)
    endpoint_df = df[df["endpoint"] == endpoint_path]
    if len(endpoint_df) == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    releases = analytics_service.analyze_release_performance(endpoint_df)
    regions = analytics_service.analyze_region_performance(endpoint_df)
    trend = analytics_service.latency_trend(endpoint_df)

    return {
        "releases": releases.to_dict(orient="records"),
        "regions": regions.to_dict(orient="records"),
        "trend": trend.to_dict(orient="records"),
    }


@router.get("/{endpoint_path:path}", response_model=EndpointDetail)
def get_endpoint(
    endpoint_path: str,
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    endpoint_df = df[df["endpoint"] == endpoint_path]
    if service:
        endpoint_df = endpoint_df[endpoint_df["service_name"] == service]
    if len(endpoint_df) == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    summary_df = analytics_service.analyze_endpoint_performance(endpoint_df)
    summary = summary_df.iloc[0].to_dict()
    percentiles = analytics_service.calculate_percentiles(endpoint_df)

    error_4xx = float(
        ((endpoint_df["status_code"] >= 400) & (endpoint_df["status_code"] < 500)).mean() * 100
    )
    error_5xx = float((endpoint_df["status_code"] >= 500).mean() * 100)

    return {
        **summary,
        "max_latency_ms": round(percentiles["max"], 2),
        "error_rate_4xx_percent": round(error_4xx, 2),
        "error_rate_5xx_percent": round(error_5xx, 2),
    }

