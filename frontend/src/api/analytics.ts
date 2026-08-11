import { apiClient } from "./client";
import type {
  EndpointDetail,
  EndpointPerformance,
  EndpointSummary,
  IncidentContext,
  IncidentOut,
  KpiOverview,
  LatencyTrendPoint,
  LogEntry,
  RegionPerformance,
  ReleasePerformance,
  ReleaseRegression,
  ServiceDetail,
  ServicePerformance,
  ServiceSummary,
} from "../types/api";

export async function fetchOverview(): Promise<KpiOverview> {
  const { data } = await apiClient.get<KpiOverview>("/analytics/overview");
  return data;
}

export async function fetchTrends(): Promise<{ points: LatencyTrendPoint[] }> {
  const { data } = await apiClient.get<{ points: LatencyTrendPoint[] }>("/analytics/trends");
  return data;
}

export async function fetchServices(): Promise<{ services: ServiceSummary[] }> {
  const { data } = await apiClient.get<{ services: ServiceSummary[] }>("/services");
  return data;
}

export async function fetchServiceDetail(serviceName: string): Promise<ServiceDetail> {
  const { data } = await apiClient.get<ServiceDetail>(`/services/${encodeURIComponent(serviceName)}`);
  return data;
}

export async function fetchServicePerformance(serviceName: string): Promise<ServicePerformance> {
  const { data } = await apiClient.get<ServicePerformance>(
    `/services/${encodeURIComponent(serviceName)}/performance`,
  );
  return data;
}

export async function analyzeService(
  serviceName: string,
): Promise<{ potential_issues: string[]; recommended_investigation: string[]; model: string }> {
  const { data } = await apiClient.post("/ai/analyze-service", { service: serviceName });
  return data;
}

export async function analyzeIncident(
  incidentId: string,
): Promise<{ potential_causes: string[]; recommended_investigation: string[]; model: string }> {
  const { data } = await apiClient.post("/ai/analyze-incident", { incident_id: incidentId });
  return data;
}

export async function fetchEndpoints(): Promise<{ endpoints: EndpointSummary[] }> {
  const { data } = await apiClient.get<{ endpoints: EndpointSummary[] }>("/endpoints");
  return data;
}

export async function fetchEndpointDetail(endpoint: string, service?: string): Promise<EndpointDetail> {
  const { data } = await apiClient.get<EndpointDetail>(`/endpoints/${encodeURIComponent(endpoint)}`, {
    params: service ? { service } : undefined,
  });
  return data;
}

export async function fetchEndpointPerformance(endpoint: string): Promise<EndpointPerformance> {
  const { data } = await apiClient.get<EndpointPerformance>(
    `/endpoints/${encodeURIComponent(endpoint)}/performance`,
  );
  return data;
}

export async function fetchReleases(): Promise<{ releases: ReleasePerformance[] }> {
  const { data } = await apiClient.get<{ releases: ReleasePerformance[] }>("/releases");
  return data;
}

export async function fetchReleaseRegressions(
  order: string[],
  service?: string,
): Promise<{ regressions: ReleaseRegression[] }> {
  const { data } = await apiClient.get<{ regressions: ReleaseRegression[] }>("/releases/regressions", {
    params: { order: order.join(","), service },
  });
  return data;
}

export async function fetchRegionPerformance(): Promise<{ regions: RegionPerformance[] }> {
  const { data } = await apiClient.get<{ regions: RegionPerformance[] }>("/regions/performance");
  return data;
}

export async function fetchIncidents(): Promise<{ incidents: IncidentOut[] }> {
  const { data } = await apiClient.get<{ incidents: IncidentOut[] }>("/incidents");
  return data;
}

export async function fetchIncident(incidentId: string): Promise<IncidentOut> {
  const { data } = await apiClient.get<IncidentOut>(`/incidents/${incidentId}`);
  return data;
}

export async function fetchIncidentContext(incidentId: string): Promise<IncidentContext> {
  const { data } = await apiClient.get<IncidentContext>(`/incidents/${incidentId}/context`);
  return data;
}

export async function updateIncidentStatus(incidentId: string, status: string): Promise<IncidentOut> {
  const { data } = await apiClient.patch<IncidentOut>(`/incidents/${incidentId}/status`, { status });
  return data;
}

export async function runIncidentDetection(): Promise<{
  incidents_created: number;
  incidents_already_open: number;
  incidents: IncidentOut[];
}> {
  const { data } = await apiClient.post("/incidents/detect", {});
  return data;
}

export async function fetchLogs(params: {
  page?: number;
  limit?: number;
  service?: string;
  endpoint?: string;
  status?: number;
  release?: string;
  region?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ page: number; limit: number; total: number; logs: LogEntry[] }> {
  const { data } = await apiClient.get("/logs", { params });
  return data;
}

export async function loadSampleDataset(): Promise<{ dataset_id: string; clean_rows: number }> {
  const { data } = await apiClient.post("/datasets/load-sample");
  return data;
}

export async function askAi(question: string): Promise<{ answer: string; model: string }> {
  const { data } = await apiClient.post("/ai/chat", { question, history: [] });
  return data;
}
