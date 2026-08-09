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
  Pagination,
  Chip,
} from "@mui/material";
import { fetchLogs } from "../api/analytics";
import type { LogEntry } from "../types/api";

const PAGE_SIZE = 25;

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [service, setService] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchLogs({
      page,
      limit: PAGE_SIZE,
      service: service || undefined,
      endpoint: endpoint || undefined,
    })
      .then((res) => {
        setLogs(res.logs);
        setTotal(res.total);
      })
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load logs"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, service, endpoint]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Logs
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Service"
          size="small"
          value={service}
          onChange={(e) => {
            setPage(1);
            setService(e.target.value);
          }}
        />
        <TextField
          label="Endpoint"
          size="small"
          value={endpoint}
          onChange={(e) => {
            setPage(1);
            setEndpoint(e.target.value);
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">
          No logs found — load a dataset from the Overview page first.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Endpoint</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Latency</TableCell>
                  <TableCell>Release</TableCell>
                  <TableCell>Region</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.service_name}</TableCell>
                    <TableCell>{log.endpoint}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status_code}
                        size="small"
                        color={log.status_code >= 400 ? "error" : "success"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {log.response_time_ms}ms
                    </TableCell>
                    <TableCell>{log.release_version}</TableCell>
                    <TableCell>{log.server_region}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, p) => setPage(p)}
            />
          </Box>
        </>
      )}
    </Box>
  );
}
