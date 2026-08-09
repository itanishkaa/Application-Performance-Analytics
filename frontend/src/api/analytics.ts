import { apiClient } from "./client";
import type {
  EndpointSummary,
  IncidentOut,
  KpiOverview,
  LatencyTrendPoint,
  LogEntry,
  RegionPerformance,
  ReleasePerformance,
  ServiceSummary,
} from "../types/api";

export async function fetchOverview(): Promise<KpiOverview> {
  const { data } = await apiClient.get<KpiOverview>("/analytics/overview");
  return data;
}

export async function fetchTrends(): Promise<{ points: LatencyTrendPoint[] }> {
  const { data } = await apiClient.get<{ points: LatencyTrendPoint[] }>(
    "/analytics/trends",
  );
  return data;
}

export async function fetchServices(): Promise<{ services: ServiceSummary[] }> {
  const { data } = await apiClient.get<{ services: ServiceSummary[] }>(
    "/services",
  );
  return data;
}

export async function fetchEndpoints(): Promise<{
  endpoints: EndpointSummary[];
}> {
  const { data } = await apiClient.get<{ endpoints: EndpointSummary[] }>(
    "/endpoints",
  );
  return data;
}

export async function fetchReleases(): Promise<{
  releases: ReleasePerformance[];
}> {
  const { data } = await apiClient.get<{ releases: ReleasePerformance[] }>(
    "/releases",
  );
  return data;
}

export async function fetchRegionPerformance(): Promise<{
  regions: RegionPerformance[];
}> {
  const { data } = await apiClient.get<{ regions: RegionPerformance[] }>(
    "/regions/performance",
  );
  return data;
}

export async function fetchIncidents(): Promise<{ incidents: IncidentOut[] }> {
  const { data } = await apiClient.get<{ incidents: IncidentOut[] }>(
    "/incidents",
  );
  return data;
}

export async function runIncidentDetection(): Promise<{
  incidents_created: number;
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
}): Promise<{ page: number; limit: number; total: number; logs: LogEntry[] }> {
  const { data } = await apiClient.get("/logs", { params });
  return data;
}

export async function loadSampleDataset(): Promise<{
  dataset_id: string;
  clean_rows: number;
}> {
  const { data } = await apiClient.post("/datasets/load-sample");
  return data;
}

export async function askAi(
  question: string,
): Promise<{ answer: string; model: string }> {
  const { data } = await apiClient.post("/ai/chat", { question, history: [] });
  return data;
}
