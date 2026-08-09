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
)
from app.services.data_access import load_logs_df
from app.services.incidents import detect_incidents

router = APIRouter(prefix="/incidents", tags=["incidents"])


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


@router.post("/detect", response_model=IncidentDetectResponse)
def run_incident_detection(
    payload: IncidentDetectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    found = detect_incidents(
        df,
        error_rate_threshold_percent=payload.error_rate_threshold_percent,
        p95_latency_threshold_ms=payload.p95_latency_threshold_ms,
        latency_regression_multiplier=payload.latency_regression_multiplier,
    )

    created_rows = []
    for item in found:
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

    db.commit()
    for row in created_rows:
        db.refresh(row)

    return {"incidents_created": len(created_rows), "incidents": created_rows}
