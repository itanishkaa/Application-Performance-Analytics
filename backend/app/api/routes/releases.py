from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.release import ReleaseListResponse, ReleaseRegressionsResponse
from app.services import analytics as analytics_service
from app.services.data_access import load_logs_df

router = APIRouter(prefix="/releases", tags=["releases"])


@router.get("", response_model=ReleaseListResponse)
def list_releases(
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=service)
    result = analytics_service.analyze_release_performance(df)
    return {"releases": result.to_dict(orient="records")}


@router.get("/compare")
def compare_releases(
    releases: str,  # comma-separated, e.g. "v1.0,v1.1,v2.0"
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    release_list = [r.strip() for r in releases.split(",") if r.strip()]
    if not release_list:
        raise HTTPException(status_code=400, detail="Provide at least one release in `releases`")

    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=service)
    df = df[df["release_version"].isin(release_list)]
    result = analytics_service.analyze_release_performance(df)
    return {"releases": result.to_dict(orient="records")}


@router.get("/regressions", response_model=ReleaseRegressionsResponse)
def get_regressions(
    order: str,  # comma-separated, chronological oldest -> newest
    service: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    release_order = [r.strip() for r in order.split(",") if r.strip()]
    if not release_order:
        raise HTTPException(status_code=400, detail="Provide chronological release order in `order`")

    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=service)
    release_perf = analytics_service.analyze_release_performance(df)
    regressions = analytics_service.detect_regressions(release_perf, release_order)
    return {"regressions": regressions.to_dict(orient="records")}
