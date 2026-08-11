import { useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Alert,
  Button,
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
  List,
  ListItem,
  ListItemText,
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
  fetchServiceDetail,
  fetchServicePerformance,
  analyzeService,
} from "../api/analytics";
import type { ServiceDetail, ServicePerformance } from "../types/api";
import { StatusChip } from "../components/StatusChip";
import { KpiCard } from "../components/KpiCard";
import { DashboardPanel } from "../components/DashboardPanel";
import { formatServiceName } from "../utils/formatting";

export default function ServiceDetailPage() {
  const { serviceName: rawServiceName } = useParams<{ serviceName: string }>();
  const serviceName = rawServiceName ? decodeURIComponent(rawServiceName) : "";

  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [performance, setPerformance] = useState<ServicePerformance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    potential_issues: string[];
    recommended_investigation: string[];
  } | null>(null);

  useEffect(() => {
    if (!serviceName) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setAnalyzeError(null);
    Promise.all([
      fetchServiceDetail(serviceName),
      fetchServicePerformance(serviceName),
    ])
      .then(([d, p]) => {
        setDetail(d);
        setPerformance(p);
      })
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load service"),
      )
      .finally(() => setLoading(false));
  }, [serviceName]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeService(serviceName);
      setAnalysis(result);
    } catch (err: any) {
      setAnalyzeError(
        err?.response?.status === 503
          ? "AI Analyst is unavailable right now (Ollama isn't running). Everything else on this page still works."
          : (err?.response?.data?.detail ?? "Failed to analyze service"),
      );
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !detail) {
    return <Alert severity="error">{error ?? "Service not found"}</Alert>;
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link
          component={RouterLink}
          to="/services"
          underline="hover"
          color="inherit"
        >
          Services
        </Link>
        <Typography color="text.primary">
          {formatServiceName(serviceName)}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Typography variant="h4">{formatServiceName(serviceName)}</Typography>
        <StatusChip status={detail.status} />
      </Box>

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
        <KpiCard
          label="Requests"
          value={detail.total_requests.toLocaleString()}
        />
        <KpiCard label="Avg Latency" value={`${detail.avg_latency_ms}ms`} />
        <KpiCard label="P95 Latency" value={`${detail.p95_latency_ms}ms`} />
        <KpiCard label="P99 Latency" value={`${detail.p99_latency_ms}ms`} />
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
        />
        <KpiCard
          label="Availability"
          value={`${detail.availability_percent}%`}
          status={
            detail.availability_percent > 99
              ? "healthy"
              : detail.availability_percent > 95
                ? "warning"
                : "critical"
          }
        />
      </Box>

      {detail.latency_trend && detail.latency_trend.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Latency Trend
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.latency_trend}>
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
        Endpoint Performance
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Endpoint</TableCell>
              <TableCell align="right">Requests</TableCell>
              <TableCell align="right">Avg</TableCell>
              <TableCell align="right">P95</TableCell>
              <TableCell align="right">P99</TableCell>
              <TableCell align="right">Error Rate</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(performance?.endpoints ?? []).map((e) => (
              <TableRow key={e.endpoint} hover>
                <TableCell>{e.endpoint}</TableCell>
                <TableCell align="right">
                  {e.requests.toLocaleString()}
                </TableCell>
                <TableCell align="right">{e.avg_latency_ms}ms</TableCell>
                <TableCell align="right">{e.p95_latency_ms}ms</TableCell>
                <TableCell align="right">{e.p99_latency_ms}ms</TableCell>
                <TableCell align="right">{e.error_rate_percent}%</TableCell>
                <TableCell>
                  <StatusChip status={e.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
              <TableCell align="right">P99</TableCell>
              <TableCell align="right">Error Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(performance?.releases ?? []).map((r) => (
              <TableRow key={r.release_version} hover>
                <TableCell>{r.release_version}</TableCell>
                <TableCell align="right">
                  {r.requests.toLocaleString()}
                </TableCell>
                <TableCell align="right">{r.avg_latency_ms}ms</TableCell>
                <TableCell align="right">{r.p95_latency_ms}ms</TableCell>
                <TableCell align="right">{r.p99_latency_ms}ms</TableCell>
                <TableCell align="right">{r.error_rate_percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Regional Performance
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Region</TableCell>
              <TableCell align="right">Requests</TableCell>
              <TableCell align="right">Avg Latency</TableCell>
              <TableCell align="right">P95</TableCell>
              <TableCell align="right">Error Rate</TableCell>
              <TableCell align="right">Availability</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(performance?.regions ?? []).map((r) => (
              <TableRow key={r.server_region} hover>
                <TableCell>{r.server_region}</TableCell>
                <TableCell align="right">
                  {r.requests.toLocaleString()}
                </TableCell>
                <TableCell align="right">{r.avg_latency_ms}ms</TableCell>
                <TableCell align="right">{r.p95_latency_ms}ms</TableCell>
                <TableCell align="right">{r.error_rate_percent}%</TableCell>
                <TableCell align="right">{r.availability_percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DashboardPanel
        title="AI Analysis"
        minHeight={0}
        action={
          <Button
            size="small"
            variant="outlined"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </Button>
        }
      >
        {analyzeError && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {analyzeError}
          </Alert>
        )}

        {!analysis && !analyzeError && (
          <Typography variant="body2" color="text.secondary">
            Run AI analysis to check this service's current metrics for
            potential issues and get a recommended investigation checklist.
          </Typography>
        )}

        {analysis && (
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              {analysis.potential_issues.length > 0
                ? "Potential issues detected"
                : "No issues detected"}
            </Typography>
            {analysis.potential_issues.length > 0 && (
              <List dense disablePadding>
                {analysis.potential_issues.map((issue, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                    <ListItemText primary={`• ${issue}`} />
                  </ListItem>
                ))}
              </List>
            )}

            {analysis.recommended_investigation.length > 0 && (
              <>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ mt: 1.5, mb: 0.5 }}
                >
                  Recommended investigation
                </Typography>
                <List dense disablePadding>
                  {analysis.recommended_investigation.map((step, i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText primary={`→ ${step}`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </DashboardPanel>
    </Box>
  );
}
