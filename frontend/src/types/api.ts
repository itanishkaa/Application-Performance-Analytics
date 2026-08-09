export interface KpiOverview {
  total_requests: number;
  error_rate_percent: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  availability_percent: number;
  slow_requests: number;
  active_services: number;
  failed_requests: number;
  error_rate_4xx_percent: number;
  error_rate_5xx_percent: number;
  error_rate_change_points: number;
  avg_latency_change_percent: number;
}

export interface LatencyTrendPoint {
  date: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  max_latency_ms: number;
}

export interface ServiceSummary {
  service_name: string;
  status: "Healthy" | "Degraded" | "Critical" | "Unknown";
  total_requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate_percent: number;
}

export interface EndpointSummary {
  endpoint: string;
  service_name: string;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate_percent: number;
  status: "Healthy" | "Degraded" | "Critical";
}

export interface ReleasePerformance {
  release_version: string;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate_percent: number;
}

export interface RegionPerformance {
  server_region: string;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate_percent: number;
  availability_percent: number;
}

export interface IncidentOut {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  service: string;
  started_at: string;
  ended_at: string | null;
  trigger_type: string;
  description: string | null;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  service_name: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  release_version: string;
  server_region: string;
}
