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
} from "@mui/material";
import { fetchReleases } from "../api/analytics";
import type { ReleasePerformance } from "../types/api";

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleasePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReleases()
      .then((res) => setReleases(res.releases))
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load releases"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Releases
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!error && releases.length === 0 && (
        <Alert severity="info">
          No releases found — load a dataset from the Overview page first.
        </Alert>
      )}

      {releases.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Release</TableCell>
                <TableCell align="right">Requests</TableCell>
                <TableCell align="right">Avg Latency</TableCell>
                <TableCell align="right">P95</TableCell>
                <TableCell align="right">P99</TableCell>
                <TableCell align="right">Error Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {releases.map((r) => (
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
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Regression detection (comparing releases in a chosen order) is available
        via <code>GET /api/v1/releases/regressions?order=v1.0,v1.1,v2.0</code> —
        wire up a UI control for this once you know your actual release
        ordering.
      </Typography>
    </Box>
  );
}
