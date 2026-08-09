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
  TextField,
} from "@mui/material";
import { fetchEndpoints } from "../api/analytics";
import type { EndpointSummary } from "../types/api";
import { StatusChip } from "../components/StatusChip";

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEndpoints()
      .then((res) => setEndpoints(res.endpoints))
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load endpoints"),
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

  const filtered = endpoints.filter(
    (e) =>
      e.endpoint.toLowerCase().includes(search.toLowerCase()) ||
      e.service_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Endpoint Explorer
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!error && endpoints.length === 0 && (
        <Alert severity="info">
          No endpoints found — load a dataset from the Overview page first.
        </Alert>
      )}

      {endpoints.length > 0 && (
        <>
          <TextField
            label="Search endpoint or service"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2, width: 320 }}
          />
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Endpoint</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell align="right">Requests</TableCell>
                  <TableCell align="right">Avg Latency</TableCell>
                  <TableCell align="right">P95</TableCell>
                  <TableCell align="right">P99</TableCell>
                  <TableCell align="right">Error Rate</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={`${e.service_name}-${e.endpoint}`} hover>
                    <TableCell>{e.endpoint}</TableCell>
                    <TableCell>{e.service_name}</TableCell>
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
        </>
      )}
    </Box>
  );
}
