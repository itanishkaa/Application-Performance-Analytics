import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Alert,
  CircularProgress,
  Button,
  Chip,
} from "@mui/material";
import { fetchIncidents, runIncidentDetection } from "../api/analytics";
import type { IncidentOut } from "../types/api";
import { formatServiceName, formatDateTime } from "../utils/formatting";

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

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectSummary, setDetectSummary] = useState<string | null>(null);
  const navigate = useNavigate();

  function loadIncidents() {
    setLoading(true);
    fetchIncidents()
      .then((res) => setIncidents(res.incidents))
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load incidents"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  async function handleDetect() {
    setDetecting(true);
    setDetectSummary(null);
    try {
      const res = await runIncidentDetection();
      setDetectSummary(
        res.incidents_created > 0
          ? `${res.incidents_created} new incident${res.incidents_created === 1 ? "" : "s"} created` +
              (res.incidents_already_open > 0
                ? ` · ${res.incidents_already_open} already open`
                : "")
          : res.incidents_already_open > 0
            ? `No new incidents — ${res.incidents_already_open} violation${res.incidents_already_open === 1 ? "" : "s"} already have an open incident`
            : "No threshold violations found",
      );
      loadIncidents();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Detection failed");
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

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">Incidents</Typography>
        <Button variant="contained" onClick={handleDetect} disabled={detecting}>
          {detecting ? "Detecting..." : "Run Detection"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {detectSummary && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setDetectSummary(null)}
        >
          {detectSummary}
        </Alert>
      )}

      {incidents.length === 0 ? (
        <Alert severity="info">
          No incidents yet. Click "Run Detection" to evaluate current thresholds
          against the loaded dataset.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Started</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incidents.map((i) => (
                <TableRow
                  key={i.id}
                  hover
                  onClick={() => navigate(`/incidents/${i.id}`)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{i.title}</TableCell>
                  <TableCell>{formatServiceName(i.service)}</TableCell>
                  <TableCell>
                    <Chip
                      label={i.severity}
                      size="small"
                      color={SEVERITY_COLOR[i.severity] ?? "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={i.status}
                      size="small"
                      color={STATUS_COLOR[i.status] ?? "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{i.trigger_type}</TableCell>
                  <TableCell>{formatDateTime(i.started_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
