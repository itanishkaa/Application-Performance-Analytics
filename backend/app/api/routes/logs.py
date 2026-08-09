from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.api_log import ApiLog
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("")
def list_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    service: Optional[str] = None,
    endpoint: Optional[str] = None,
    status: Optional[int] = None,
    release: Optional[str] = None,
    region: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ApiLog)
    count_query = select(func.count()).select_from(ApiLog)

    filters = []
    if service:
        filters.append(ApiLog.service_name == service)
    if endpoint:
        filters.append(ApiLog.endpoint == endpoint)
    if status:
        filters.append(ApiLog.status_code == status)
    if release:
        filters.append(ApiLog.release_version == release)
    if region:
        filters.append(ApiLog.server_region == region)
    if date_from:
        filters.append(ApiLog.timestamp >= date_from)
    if date_to:
        filters.append(ApiLog.timestamp <= date_to)

    for f in filters:
        query = query.where(f)
        count_query = count_query.where(f)

    total = db.scalar(count_query) or 0

    query = query.order_by(ApiLog.timestamp.desc()).offset((page - 1) * limit).limit(limit)
    rows = db.scalars(query).all()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "logs": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "service_name": r.service_name,
                "endpoint": r.endpoint,
                "status_code": r.status_code,
                "response_time_ms": r.response_time_ms,
                "release_version": r.release_version,
                "server_region": r.server_region,
            }
            for r in rows
        ],
    }


@router.get("/{log_id}")
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(ApiLog, log_id)
    if not row:
        raise HTTPException(status_code=404, detail="Log not found")

    return {
        "id": row.id,
        "timestamp": row.timestamp.isoformat(),
        "service_name": row.service_name,
        "endpoint": row.endpoint,
        "status_code": row.status_code,
        "response_time_ms": row.response_time_ms,
        "release_version": row.release_version,
        "server_region": row.server_region,
        "dataset_id": row.dataset_id,
    }
