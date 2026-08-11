from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import (
    IncidentDetectRequest,
    IncidentDetectResponse,
    IncidentListResponse,
    IncidentOut,
    IncidentStatusUpdate,
)
from app.services import analytics as analytics_service
from app.services.data_access import load_logs_df
from app.services.incidents import detect_incidents

router = APIRouter(prefix="/incidents", tags=["incidents"])

VALID_STATUSES = {"open", "acknowledged", "resolved"}


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.scalars(select(Incident).order_by(Incident.started_at.desc())).all()
    return {"incidents": rows}


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(Incident, incident_id)
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    return row


@router.get("/{incident_id}/context")
def get_incident_context(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Current metrics + affected endpoints for the incident's service —
    what the Incident Details page (PRD section 27) renders alongside the
    static incident fields."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    df = load_logs_df(db)
    service_df = analytics_service.apply_filters(df, service=incident.service)
    kpis = analytics_service.calculate_kpis(service_df)
    endpoints = (
        analytics_service.analyze_endpoint_performance(service_df)
        .sort_values("error_rate_percent", ascending=False)
        .head(5)
    )

    return {
        "current_metrics": {
            "error_rate_percent": kpis["error_rate_percent"],
            "avg_latency_ms": kpis["avg_latency_ms"],
            "p95_latency_ms": kpis["p95_latency_ms"],
        },
        "affected_endpoints": endpoints["endpoint"].tolist(),
    }


@router.patch("/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Incident lifecycle (PRD section 3): open -> acknowledged -> resolved."""
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUSES)}")

    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = payload.status
    if payload.status == "resolved" and incident.ended_at is None:
        incident.ended_at = datetime.now(timezone.utc)
    elif payload.status != "resolved":
        incident.ended_at = None

    db.commit()
    db.refresh(incident)
    return incident


@router.post("/detect", response_model=IncidentDetectResponse)
def run_incident_detection(
    payload: IncidentDetectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Idempotent: a violation whose (service, trigger_type) already has an
    OPEN incident doesn't create a duplicate — repeated clicks on
    "Run Detection" just re-confirm the same open incidents rather than
    piling up copies."""
    df = load_logs_df(db)
    found = detect_incidents(
        df,
        error_rate_threshold_percent=payload.error_rate_threshold_percent,
        p95_latency_threshold_ms=payload.p95_latency_threshold_ms,
        latency_regression_multiplier=payload.latency_regression_multiplier,
    )

    open_incidents = db.scalars(select(Incident).where(Incident.status == "open")).all()
    open_keys = {(i.service, i.trigger_type) for i in open_incidents}

    created_rows = []
    already_open = 0
    for item in found:
        key = (item["service"], item["trigger_type"])
        if key in open_keys:
            already_open += 1
            continue

        incident = Incident(
            title=item["title"],
            severity=item["severity"],
            service=item["service"],
            trigger_type=item["trigger_type"],
            description=item["description"],
            status="open",
        )
        db.add(incident)
        created_rows.append(incident)
        open_keys.add(key)  # guard against duplicates within the same detection run

    db.commit()
    for row in created_rows:
        db.refresh(row)

    return {
        "incidents_created": len(created_rows),
        "incidents_already_open": already_open,
        "incidents": created_rows,
    }
