import { useEffect, useState } from "react";
import {
  useParams,
  useSearchParams,
  Link as RouterLink,
} from "react-router-dom";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
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
  fetchEndpointDetail,
  fetchEndpointPerformance,
} from "../api/analytics";
import type { EndpointDetail, EndpointPerformance } from "../types/api";
import { StatusChip } from "../components/StatusChip";
import { KpiCard } from "../components/KpiCard";
import {
  formatEndpointName,
  formatServiceName,
  formatReleaseName,
  formatRegionName,
} from "../utils/formatting";

export default function EndpointDetailPage() {
  const { endpointPath: rawEndpoint } = useParams<{ endpointPath: string }>();
  const endpoint = rawEndpoint ? decodeURIComponent(rawEndpoint) : "";
  const [searchParams] = useSearchParams();
  const service = searchParams.get("service") ?? undefined;

  const [detail, setDetail] = useState<EndpointDetail | null>(null);
  const [performance, setPerformance] = useState<EndpointPerformance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchEndpointDetail(endpoint, service),
      fetchEndpointPerformance(endpoint),
    ])
      .then(([d, p]) => {
        setDetail(d);
        setPerformance(p);
      })
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load endpoint"),
      )
      .finally(() => setLoading(false));
  }, [endpoint, service]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !detail) {
    return <Alert severity="error">{error ?? "Endpoint not found"}</Alert>;
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link
          component={RouterLink}
          to="/endpoints"
          underline="hover"
          color="inherit"
        >
          Endpoints
        </Link>
        <Typography color="text.primary">
          {formatEndpointName(endpoint)}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Typography variant="h4">{formatEndpointName(endpoint)}</Typography>
        <StatusChip status={detail.status} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {formatServiceName(detail.service_name)}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <KpiCard label="Requests" value={detail.requests.toLocaleString()} />
        <KpiCard label="Avg Latency" value={`${detail.avg_latency_ms}ms`} />
        <KpiCard label="P95 Latency" value={`${detail.p95_latency_ms}ms`} />
        <KpiCard label="P99 Latency" value={`${detail.p99_latency_ms}ms`} />
        <KpiCard label="Max Latency" value={`${detail.max_latency_ms}ms`} />
        <KpiCard
          label="Error Rate"
          value={`${detail.error_rate_percent}%`}
          status={
            detail.error_rate_percent > 10
              ? "critical"
              : detail.error_rate_percent > 3
                ? "warning"
                : "healthy"
          }
          subtext={`4xx ${detail.error_rate_4xx_percent}% · 5xx ${detail.error_rate_5xx_percent}%`}
        />
      </Box>

      {performance && performance.trend.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Latency Trend
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance.trend}>
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

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Release Performance
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Release</TableCell>
              <TableCell align="right">Requests</TableCell>
              <TableCell align="right">Avg</TableCell>
              <TableCell align="right">P95</TableCell>
              <TableCell align="right">Error Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(performance?.releases ?? []).map((r) => (
              <TableRow key={r.release_version} hover>
                <TableCell>{formatReleaseName(r.release_version)}</TableCell>
                <TableCell align="right">
                  {r.requests.toLocaleString()}
                </TableCell>
                <TableCell align="right">{r.avg_latency_ms}ms</TableCell>
                <TableCell align="right">{r.p95_latency_ms}ms</TableCell>
                <TableCell align="right">{r.error_rate_percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Regional Performance
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Region</TableCell>
              <TableCell align="right">Requests</TableCell>
              <TableCell align="right">Avg Latency</TableCell>
              <TableCell align="right">Error Rate</TableCell>
              <TableCell align="right">Availability</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(performance?.regions ?? []).map((r) => (
              <TableRow key={r.server_region} hover>
                <TableCell>{formatRegionName(r.server_region)}</TableCell>
                <TableCell align="right">
                  {r.requests.toLocaleString()}
                </TableCell>
                <TableCell align="right">{r.avg_latency_ms}ms</TableCell>
                <TableCell align="right">{r.error_rate_percent}%</TableCell>
                <TableCell align="right">{r.availability_percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
