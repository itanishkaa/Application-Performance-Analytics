from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.service import ServiceDetail, ServiceListResponse, ServiceSummary
from app.services import analytics as analytics_service
from app.services.data_access import load_logs_df

router = APIRouter(prefix="/services", tags=["services"])


UNKNOWN_SERVICE_NAME = "unknown-service"


def _summarize(df, service_name: str) -> dict:
    service_df = df[df["service_name"] == service_name]
    kpis = analytics_service.calculate_kpis(service_df)
    percentiles = analytics_service.calculate_percentiles(service_df)

    if service_name == UNKNOWN_SERVICE_NAME:
        # Rows where the source log had no service identifier at all —
        # these aren't a real application to grade "Critical", so give
        # them a neutral status rather than folding them into the same
        # health scale as an actual service.
        status = "Unknown"
    else:
        status = "Healthy"
        if kpis["error_rate_percent"] > 5 or percentiles["p95"] > 2000:
            status = "Critical"
        elif kpis["error_rate_percent"] > 2 or percentiles["p95"] > 1000:
            status = "Degraded"

    return {
        "service_name": service_name,
        "status": status,
        "total_requests": kpis["total_requests"],
        "avg_latency_ms": kpis["avg_latency_ms"],
        "p95_latency_ms": kpis["p95_latency_ms"],
        "error_rate_percent": kpis["error_rate_percent"],
        "availability_percent": kpis["availability_percent"],
    }


@router.get("", response_model=ServiceListResponse)
def list_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    if len(df) == 0:
        return {"services": []}

    summaries = [_summarize(df, name) for name in sorted(df["service_name"].unique())]
    return {"services": summaries}

@router.get("/{service_name}/performance")
def get_service_performance(
    service_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Endpoint- and release-level breakdown for a single service."""
    df = load_logs_df(db)
    service_df = df[df["service_name"] == service_name]
    if len(service_df) == 0:
        raise HTTPException(status_code=404, detail="Service not found")

    endpoints = analytics_service.analyze_endpoint_performance(service_df)
    releases = analytics_service.analyze_release_performance(service_df)
    regions = analytics_service.analyze_region_performance(service_df)

    return {
        "endpoints": endpoints.to_dict(orient="records"),
        "releases": releases.to_dict(orient="records"),
        "regions": regions.to_dict(orient="records"),
    }


@router.get("/{service_name}", response_model=ServiceDetail)
def get_service(
    service_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    service_df = df[df["service_name"] == service_name]
    if len(service_df) == 0:
        raise HTTPException(status_code=404, detail="Service not found")

    summary = _summarize(df, service_name)
    percentiles = analytics_service.calculate_percentiles(service_df)
    trend_df = analytics_service.latency_trend(service_df)

    return {
        **summary,
        "p99_latency_ms": round(percentiles["p99"], 2),
        "endpoints": sorted(service_df["endpoint"].unique().tolist()),
        "releases": sorted(service_df["release_version"].unique().tolist()),
        "regions": sorted(service_df["server_region"].unique().tolist()),
        "latency_trend": trend_df.to_dict(orient="records"),
        "error_trend": None,
    }

