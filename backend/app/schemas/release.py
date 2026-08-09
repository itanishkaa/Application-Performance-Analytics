from typing import List, Optional

from pydantic import BaseModel


class ReleasePerformance(BaseModel):
    release_version: str
    requests: int
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    error_rate_percent: float


class ReleaseListResponse(BaseModel):
    releases: List[ReleasePerformance]


class ReleaseRegression(BaseModel):
    release_version: str
    previous_release_version: Optional[str]
    avg_latency_change_percent: float
    p95_latency_change_percent: float
    error_rate_change_points: float
    is_regression: bool


class ReleaseRegressionsResponse(BaseModel):
    regressions: List[ReleaseRegression]
