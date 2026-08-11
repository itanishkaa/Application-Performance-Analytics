import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Button,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  fetchOverview,
  fetchTrends,
  fetchServices,
  fetchEndpoints,
  fetchIncidents,
  loadSampleDataset,
  runIncidentDetection,
} from "../api/analytics";
import type {
  KpiOverview,
  LatencyTrendPoint,
  ServiceSummary,
  EndpointSummary,
  IncidentOut,
} from "../types/api";
import { KpiCard } from "../components/KpiCard";
import { DashboardPanel } from "../components/DashboardPanel";
import { StatusChip } from "../components/StatusChip";
import { formatServiceName, formatEndpointName } from "../utils/formatting";

const SEVERITY_DOT: Record<string, string> = {
  low: "#64748b",
  medium: "#ed6c02",
  high: "#f97316",
  critical: "#d32f2f",
};

function errorRateStatus(rate: number): "healthy" | "warning" | "critical" {
  return rate > 10 ? "critical" : rate > 3 ? "warning" : "healthy";
}

function availabilityStatus(rate: number): "healthy" | "warning" | "critical" {
  return rate > 99 ? "healthy" : rate > 95 ? "warning" : "critical";
}

function changeLabel(points: number, unit: "pt" | "%"): string {
  if (Math.abs(points) < 0.05) return "Flat vs previous period";
  const arrow = points > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(points).toFixed(1)}${unit} vs previous period`;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiOverview | null>(null);
  const [trend, setTrend] = useState<LatencyTrendPoint[]>([]);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [incidents, setIncidents] = useState<IncidentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [detecting, setDetecting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [overview, trends, svc, eps, inc] = await Promise.all([
        fetchOverview(),
        fetchTrends(),
        fetchServices(),
        fetchEndpoints(),
        fetchIncidents(),
      ]);
      setKpis(overview);
      setTrend(trends.points);
      setServices(svc.services);
      setEndpoints(eps.endpoints);
      setIncidents(inc.incidents);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLoadSample() {
    setLoadingSample(true);
    try {
      await loadSampleDataset();
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load sample dataset");
    } finally {
      setLoadingSample(false);
    }
  }

  async function handleRunDetection() {
    setDetecting(true);
    try {
      await runIncidentDetection();
      const inc = await fetchIncidents();
      setIncidents(inc.incidents);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Failed to run incident detection",
      );
    } finally {
      setDetecting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const noData = kpis && kpis.total_requests === 0;

  const servicesByErrorRate = [...services]
    .sort((a, b) => b.error_rate_percent - a.error_rate_percent)
    .slice(0, 5);
  const slowestEndpoints = [...endpoints]
    .sort((a, b) => b.p95_latency_ms - a.p95_latency_ms)
    .slice(0, 5);
  const recentIncidents = incidents.slice(0, 5);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h4">Overview</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {noData && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleLoadSample}
              disabled={loadingSample}
            >
              {loadingSample ? "Loading..." : "Load sample dataset"}
            </Button>
          }
        >
          No data yet. Load the bundled ~50K-row synthetic dataset to explore
          the dashboard.
        </Alert>
      )}

      {/* KPIs — two rows of four, each with context so the numbers read as
          intentional signal rather than "something looks broken". */}
      {kpis && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <KpiCard
            label="Requests"
            value={kpis.total_requests.toLocaleString()}
          />
          <KpiCard
            label="Error Rate"
            value={`${kpis.error_rate_percent}%`}
            status={errorRateStatus(kpis.error_rate_percent)}
            statusLabel={
              errorRateStatus(kpis.error_rate_percent) === "critical"
                ? "High"
                : undefined
            }
            subtext={`5xx errors account for ${kpis.error_rate_5xx_percent}%`}
          />
          <KpiCard
            label="Avg Latency"
            value={`${kpis.avg_latency_ms}ms`}
            subtext={changeLabel(kpis.avg_latency_change_percent, "%")}
          />
          <KpiCard label="P95 Latency" value={`${kpis.p95_latency_ms}ms`} />
          <KpiCard label="P99 Latency" value={`${kpis.p99_latency_ms}ms`} />
          <KpiCard
            label="Availability"
            value={`${kpis.availability_percent}%`}
            status={availabilityStatus(kpis.availability_percent)}
            statusLabel={
              availabilityStatus(kpis.availability_percent) === "critical"
                ? "Critical"
                : undefined
            }
            subtext={`${kpis.failed_requests.toLocaleString()} failed requests`}
          />
          <KpiCard
            label="Slow Requests"
            value={kpis.slow_requests.toLocaleString()}
          />
          <KpiCard label="Active Services" value={kpis.active_services} />
        </Box>
      )}

      {/* Trend — deliberately compact. This should orient you, not dominate
          the page; the panels below are where "what's wrong" lives. */}
      {trend.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Latency Trend
          </Typography>
          <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis unit="ms" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_latency_ms"
                  name="Avg"
                  stroke="#3b82f6"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95_latency_ms"
                  name="P95"
                  stroke="#ed6c02"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p99_latency_ms"
                  name="P99"
                  stroke="#d32f2f"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}

      {/* Problems, at a glance */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 2,
        }}
      >
        <DashboardPanel title="Service Health">
          {services.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No services yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1}>
              {services.map((s) => (
                <Box
                  key={s.service_name}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">
                    {formatServiceName(s.service_name)}
                  </Typography>
                  <StatusChip status={s.status} />
                </Box>
              ))}
            </Stack>
          )}
        </DashboardPanel>

        <DashboardPanel title="Error Rate by Service">
          {servicesByErrorRate.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No services yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1}>
              {servicesByErrorRate.map((s) => (
                <Box
                  key={s.service_name}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">
                    {formatServiceName(s.service_name)}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      color:
                        s.error_rate_percent > 10
                          ? "#d32f2f"
                          : s.error_rate_percent > 3
                            ? "#ed6c02"
                            : "#2e7d32",
                    }}
                  >
                    {s.error_rate_percent}%
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </DashboardPanel>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
        }}
      >
        <DashboardPanel title="Slowest Endpoints">
          {slowestEndpoints.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No endpoints yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1}>
              {slowestEndpoints.map((e) => (
                <Box
                  key={`${e.service_name}-${e.endpoint}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="body2">
                      {formatEndpointName(e.endpoint)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatServiceName(e.service_name)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {(e.p95_latency_ms / 1000).toFixed(2)}s
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Recent Incidents"
          action={
            <Button
              size="small"
              onClick={handleRunDetection}
              disabled={detecting}
            >
              {detecting ? "Scanning..." : "Run detection"}
            </Button>
          }
        >
          {recentIncidents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No incidents detected yet. Run detection to scan current data
              against your thresholds.
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1}>
              {recentIncidents.map((inc) => (
                <Box
                  key={inc.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: SEVERITY_DOT[inc.severity] ?? "#64748b",
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {inc.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inc.service} · {inc.status}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DashboardPanel>
      </Box>
    </Box>
  );
}
