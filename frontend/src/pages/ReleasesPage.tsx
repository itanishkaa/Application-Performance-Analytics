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
  Select,
  MenuItem,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import { fetchReleases, fetchReleaseRegressions } from "../api/analytics";
import type { ReleasePerformance, ReleaseRegression } from "../types/api";
import { formatReleaseName } from "../utils/formatting";
import { DashboardPanel } from "../components/DashboardPanel";

function changeCell(
  value: number,
  unit: "%" | "pt",
): { text: string; color: string } {
  if (Math.abs(value) < 0.05)
    return { text: `0${unit}`, color: "text.secondary" };
  const arrow = value > 0 ? "+" : "";
  const color = value > 0 ? "#d32f2f" : "#2e7d32";
  return { text: `${arrow}${value.toFixed(2)}${unit}`, color };
}

function verdict(r: ReleaseRegression): {
  label: string;
  emoji: string;
  color: string;
} {
  if (!r.is_regression)
    return { label: "Stable", emoji: "🟢", color: "#2e7d32" };
  const magnitude = Math.max(
    Math.abs(r.avg_latency_change_percent),
    Math.abs(r.p95_latency_change_percent),
  );
  return magnitude > 50
    ? { label: "Regression", emoji: "🔴", color: "#d32f2f" }
    : { label: "Minor Regression", emoji: "🟡", color: "#ed6c02" };
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleasePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromRelease, setFromRelease] = useState("");
  const [toRelease, setToRelease] = useState("");
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<ReleaseRegression | null>(
    null,
  );
  const [compareError, setCompareError] = useState<string | null>(null);

  const [trend, setTrend] = useState<ReleaseRegression[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    fetchReleases()
      .then((res) => {
        setReleases(res.releases);
        const versions = res.releases.map((r) => r.release_version).sort();
        if (versions.length >= 2) {
          setFromRelease(versions[versions.length - 2]);
          setToRelease(versions[versions.length - 1]);
        }
        if (versions.length >= 2) {
          setTrendLoading(true);
          fetchReleaseRegressions(versions)
            .then((res) =>
              setTrend(
                res.regressions.filter((r) => r.previous_release_version),
              ),
            )
            .catch(() => {})
            .finally(() => setTrendLoading(false));
        }
      })
      .catch((err) =>
        setError(err?.response?.data?.detail ?? "Failed to load releases"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleCompare() {
    if (!fromRelease || !toRelease || fromRelease === toRelease) return;
    setComparing(true);
    setCompareError(null);
    setCompareResult(null);
    try {
      const res = await fetchReleaseRegressions([fromRelease, toRelease]);
      const result = res.regressions.find(
        (r) => r.release_version === toRelease,
      );
      setCompareResult(result ?? null);
    } catch (err: any) {
      setCompareError(
        err?.response?.data?.detail ?? "Failed to compare releases",
      );
    } finally {
      setComparing(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const releaseOptions = releases.map((r) => r.release_version).sort();

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
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
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
                    <TableCell>
                      {formatReleaseName(r.release_version)}
                    </TableCell>
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

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <DashboardPanel title="Release Comparison" minHeight={0}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Select
                  size="small"
                  value={fromRelease}
                  onChange={(e) => setFromRelease(e.target.value)}
                >
                  {releaseOptions.map((v) => (
                    <MenuItem key={v} value={v}>
                      {formatReleaseName(v)}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="body2" color="text.secondary">
                  →
                </Typography>
                <Select
                  size="small"
                  value={toRelease}
                  onChange={(e) => setToRelease(e.target.value)}
                >
                  {releaseOptions.map((v) => (
                    <MenuItem key={v} value={v}>
                      {formatReleaseName(v)}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCompare}
                  disabled={comparing || fromRelease === toRelease}
                >
                  {comparing ? "Comparing..." : "Compare"}
                </Button>
              </Stack>

              {compareError && <Alert severity="error">{compareError}</Alert>}

              {compareResult && (
                <Box>
                  <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                    {(
                      [
                        [
                          "Avg Latency",
                          compareResult.avg_latency_change_percent,
                          "%",
                        ],
                        [
                          "P95 Latency",
                          compareResult.p95_latency_change_percent,
                          "%",
                        ],
                        [
                          "Error Rate",
                          compareResult.error_rate_change_points,
                          "pt",
                        ],
                      ] as const
                    ).map(([label, value, unit]) => {
                      const c = changeCell(value, unit);
                      return (
                        <Box
                          key={label}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">{label}</Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ color: c.color }}
                          >
                            {c.text}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  {(() => {
                    const v = verdict(compareResult);
                    return (
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: v.color }}
                      >
                        {v.emoji} {v.label}
                      </Typography>
                    );
                  })()}
                </Box>
              )}

              {!compareResult && !compareError && (
                <Typography variant="body2" color="text.secondary">
                  Pick two releases and compare to see the change in latency and
                  error rate.
                </Typography>
              )}
            </DashboardPanel>

            <DashboardPanel title="Release Stability" minHeight={0}>
              {trendLoading ? (
                <CircularProgress size={20} />
              ) : trend.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Need at least two releases to show stability trend.
                </Typography>
              ) : (
                <Stack divider={<Divider />} spacing={1}>
                  {trend.map((r) => {
                    const v = verdict(r);
                    return (
                      <Box
                        key={r.release_version}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box>
                          <Typography variant="body2">
                            {formatReleaseName(r.release_version)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            vs{" "}
                            {r.previous_release_version
                              ? formatReleaseName(r.previous_release_version)
                              : "—"}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: v.color }}
                        >
                          {v.emoji} {v.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </DashboardPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
