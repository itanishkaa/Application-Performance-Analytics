import { useEffect, useState } from "react";
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
import { fetchIncidents } from "../api/analytics";
import { apiClient } from "../api/client";
import type { IncidentOut } from "../types/api";

const SEVERITY_COLOR: Record<string, "default" | "warning" | "error"> = {
  low: "default",
  medium: "warning",
  high: "error",
  critical: "error",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await apiClient.post("/incidents/detect", {});
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
                <TableRow key={i.id} hover>
                  <TableCell>{i.title}</TableCell>
                  <TableCell>{i.service}</TableCell>
                  <TableCell>
                    <Chip
                      label={i.severity}
                      size="small"
                      color={SEVERITY_COLOR[i.severity] ?? "default"}
                    />
                  </TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell>{i.trigger_type}</TableCell>
                  <TableCell>
                    {new Date(i.started_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
