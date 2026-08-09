from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class KpiOverview(BaseModel):
    total_requests: int
    error_rate_percent: float
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    availability_percent: float
    slow_requests: int
    active_services: int
    failed_requests: int
    error_rate_4xx_percent: float
    error_rate_5xx_percent: float
    error_rate_change_points: float
    avg_latency_change_percent: float


class LatencyTrendPoint(BaseModel):
    date: date
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float


class TrendsResponse(BaseModel):
    points: List[LatencyTrendPoint]


class OutlierRequest(BaseModel):
    id: int
    timestamp: str
    service_name: str
    endpoint: str
    status_code: int
    response_time_ms: int
    release_version: str
    server_region: str


class OutliersResponse(BaseModel):
    method: str
    threshold_ms: Optional[float] = None
    outlier_count: int
    outliers: List[OutlierRequest]


class AnalyticsFilters(BaseModel):
    """Shared query filters accepted by most analytics endpoints."""

    service: Optional[str] = None
    endpoint: Optional[str] = None
    release: Optional[str] = None
    region: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
