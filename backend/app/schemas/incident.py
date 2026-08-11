from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    severity: str
    status: str
    service: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    trigger_type: str
    description: Optional[str] = None


class IncidentListResponse(BaseModel):
    incidents: List[IncidentOut]


class IncidentDetectRequest(BaseModel):
    """Optional overrides for the deterministic detection thresholds.
    Falls back to app.core.config.settings when omitted.
    """

    error_rate_threshold_percent: Optional[float] = None
    p95_latency_threshold_ms: Optional[float] = None
    latency_regression_multiplier: Optional[float] = None


class IncidentDetectResponse(BaseModel):
    incidents_created: int
    incidents_already_open: int
    incidents: List[IncidentOut]


class IncidentStatusUpdate(BaseModel):
    status: str  # acknowledged | resolved
