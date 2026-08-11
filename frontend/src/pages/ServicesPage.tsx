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
} from "@mui/material";
import { fetchServices } from "../api/analytics";
import type { ServiceSummary } from "../types/api";
import { StatusChip } from "../components/StatusChip";
import { formatServiceName } from "../utils/formatting";

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices()
      .then((res) => setServices(res.services))
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load services"),
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
        Services
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!error && services.length === 0 && (
        <Alert severity="info">
          No services found — load a dataset from the Overview page first.
        </Alert>
      )}

      {services.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Requests</TableCell>
                <TableCell align="right">Avg Latency</TableCell>
                <TableCell align="right">P95 Latency</TableCell>
                <TableCell align="right">Error Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((s) => (
                <TableRow
                  key={s.service_name}
                  hover
                  onClick={() =>
                    navigate(`/services/${encodeURIComponent(s.service_name)}`)
                  }
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{formatServiceName(s.service_name)}</TableCell>
                  <TableCell>
                    <StatusChip status={s.status} />
                  </TableCell>
                  <TableCell align="right">
                    {s.total_requests.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">{s.avg_latency_ms}ms</TableCell>
                  <TableCell align="right">{s.p95_latency_ms}ms</TableCell>
                  <TableCell align="right">{s.error_rate_percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
