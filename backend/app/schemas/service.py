from typing import List, Optional

from pydantic import BaseModel


class ServiceSummary(BaseModel):
    service_name: str
    status: str  # Healthy | Degraded | Critical | Unknown
    total_requests: int
    avg_latency_ms: float
    p95_latency_ms: float
    error_rate_percent: float


class ServiceListResponse(BaseModel):
    services: List[ServiceSummary]


class ServiceDetail(ServiceSummary):
    p99_latency_ms: float
    endpoints: List[str]
    releases: List[str]
    regions: List[str]
    latency_trend: Optional[list] = None
    error_trend: Optional[list] = None
