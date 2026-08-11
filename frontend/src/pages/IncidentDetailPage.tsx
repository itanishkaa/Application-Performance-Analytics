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
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  fetchIncident,
  fetchIncidentContext,
  updateIncidentStatus,
  analyzeIncident,
} from "../api/analytics";
import type { IncidentOut, IncidentContext } from "../types/api";
import { DashboardPanel } from "../components/DashboardPanel";
import { KpiCard } from "../components/KpiCard";
import {
  formatServiceName,
  formatEndpointName,
  formatDateTime,
} from "../utils/formatting";

const SEVERITY_COLOR: Record<string, "default" | "warning" | "error"> = {
  low: "default",
  medium: "warning",
  high: "error",
  critical: "error",
};

const STATUS_COLOR: Record<string, "info" | "warning" | "success"> = {
  open: "info",
  acknowledged: "warning",
  resolved: "success",
};

export default function IncidentDetailPage() {
  const { incidentId } = useParams<{ incidentId: string }>();

  const [incident, setIncident] = useState<IncidentOut | null>(null);
  const [context, setContext] = useState<IncidentContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    potential_causes: string[];
    recommended_investigation: string[];
  } | null>(null);

  function load() {
    if (!incidentId) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchIncident(incidentId), fetchIncidentContext(incidentId)])
      .then(([i, c]) => {
        setIncident(i);
        setContext(c);
      })
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load incident"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, [incidentId]);

  async function handleStatusChange(status: "acknowledged" | "resolved") {
    if (!incidentId) return;
    setUpdating(true);
    try {
      const updated = await updateIncidentStatus(incidentId, status);
      setIncident(updated);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Failed to update incident status",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleAnalyze() {
    if (!incidentId) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeIncident(incidentId);
      setAnalysis(result);
    } catch (err: any) {
      setAnalyzeError(
        err?.response?.status === 503
          ? "AI Analyst is unavailable right now (Ollama isn't running)."
          : (err?.response?.data?.detail ?? "Failed to analyze incident"),
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

  if (error || !incident) {
    return <Alert severity="error">{error ?? "Incident not found"}</Alert>;
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link
          component={RouterLink}
          to="/incidents"
          underline="hover"
          color="inherit"
        >
          Incidents
        </Link>
        <Typography color="text.primary">{incident.title}</Typography>
      </Breadcrumbs>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h4">{incident.title}</Typography>
        <Chip
          label={incident.severity.toUpperCase()}
          color={SEVERITY_COLOR[incident.severity] ?? "default"}
          size="small"
        />
        <Chip
          label={incident.status}
          color={STATUS_COLOR[incident.status] ?? "default"}
          size="small"
          variant="outlined"
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {formatServiceName(incident.service)} · started{" "}
        {formatDateTime(incident.started_at)}
      </Typography>

      {context && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <KpiCard
            label="Error Rate"
            value={`${context.current_metrics.error_rate_percent}%`}
          />
          <KpiCard
            label="Avg Latency"
            value={`${context.current_metrics.avg_latency_ms}ms`}
          />
          <KpiCard
            label="P95 Latency"
            value={`${context.current_metrics.p95_latency_ms}ms`}
          />
        </Box>
      )}

      {incident.description && (
        <Typography variant="body2" sx={{ mb: 3 }}>
          {incident.description}
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <DashboardPanel title="Affected Endpoints" minHeight={0}>
          {!context || context.affected_endpoints.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No specific endpoints stand out.
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1}>
              {context.affected_endpoints.map((ep) => (
                <Typography key={ep} variant="body2">
                  {formatEndpointName(ep)}
                </Typography>
              ))}
            </Stack>
          )}
        </DashboardPanel>

        <DashboardPanel title="Lifecycle" minHeight={0}>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Move this incident through the review workflow as you investigate.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={
                  incident.status === "acknowledged" ? "contained" : "outlined"
                }
                disabled={updating || incident.status !== "open"}
                onClick={() => handleStatusChange("acknowledged")}
              >
                Acknowledge
              </Button>
              <Button
                size="small"
                variant={
                  incident.status === "resolved" ? "contained" : "outlined"
                }
                color="success"
                disabled={updating || incident.status === "resolved"}
                onClick={() => handleStatusChange("resolved")}
              >
                Resolve
              </Button>
            </Stack>
          </Stack>
        </DashboardPanel>
      </Box>

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
            Run AI analysis for potential contributing factors and a recommended
            investigation checklist, grounded in this incident's current
            metrics.
          </Typography>
        )}

        {analysis && (
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Potential causes
            </Typography>
            <List dense disablePadding>
              {analysis.potential_causes.map((cause, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                  <ListItemText primary={`• ${cause}`} />
                </ListItem>
              ))}
            </List>

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
