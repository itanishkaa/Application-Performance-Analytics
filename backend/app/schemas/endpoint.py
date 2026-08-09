from typing import List

from pydantic import BaseModel


class EndpointSummary(BaseModel):
    endpoint: str
    service_name: str
    requests: int
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    error_rate_percent: float
    status: str  # Healthy | Degraded | Critical


class EndpointListResponse(BaseModel):
    endpoints: List[EndpointSummary]


class EndpointDetail(EndpointSummary):
    max_latency_ms: float
    error_rate_4xx_percent: float
    error_rate_5xx_percent: float
