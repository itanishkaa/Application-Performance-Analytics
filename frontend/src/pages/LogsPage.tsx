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
  Stack,
} from "@mui/material";
import { fetchLogs } from "../api/analytics";
import type { LogEntry } from "../types/api";
import {
  formatServiceName,
  formatEndpointName,
  formatReleaseName,
  formatRegionName,
  formatDateTime,
} from "../utils/formatting";

const PAGE_SIZE = 25;

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [service, setService] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [status, setStatus] = useState("");
  const [release, setRelease] = useState("");
  const [region, setRegion] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchLogs({
      page,
      limit: PAGE_SIZE,
      service: service || undefined,
      endpoint: endpoint || undefined,
      status: status ? Number(status) : undefined,
      release: release || undefined,
      region: region || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
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
  }, [page, service, endpoint, status, release, region, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function filterField(
    label: string,
    value: string,
    setValue: (v: string) => void,
    type: "text" | "number" | "date" = "text",
  ) {
    return (
      <TextField
        label={label}
        size="small"
        type={type}
        value={value}
        InputLabelProps={type === "date" ? { shrink: true } : undefined}
        onChange={(e) => {
          setPage(1);
          setValue(e.target.value);
        }}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Logs
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
        {filterField("Service", service, setService)}
        {filterField("Endpoint", endpoint, setEndpoint)}
        {filterField("Status", status, setStatus, "number")}
        {filterField("Release", release, setRelease)}
        {filterField("Region", region, setRegion)}
        {filterField("From", dateFrom, setDateFrom, "date")}
        {filterField("To", dateTo, setDateTo, "date")}
      </Stack>

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
          No logs found — load a dataset from the Overview page first, or clear
          your filters.
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
                    <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                    <TableCell>{formatServiceName(log.service_name)}</TableCell>
                    <TableCell>{formatEndpointName(log.endpoint)}</TableCell>
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
                    <TableCell>
                      {formatReleaseName(log.release_version)}
                    </TableCell>
                    <TableCell>{formatRegionName(log.server_region)}</TableCell>
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
