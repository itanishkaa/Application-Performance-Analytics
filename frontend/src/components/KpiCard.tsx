import { Paper, Typography, Box } from "@mui/material";

interface KpiCardProps {
  label: string;
  value: string | number;
  status?: "healthy" | "warning" | "critical";
  statusLabel?: string;
  subtext?: string;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "#2e7d32",
  warning: "#ed6c02",
  critical: "#d32f2f",
};

export function KpiCard({
  label,
  value,
  status,
  statusLabel,
  subtext,
}: KpiCardProps) {
  return (
    <Paper sx={{ p: 2, minWidth: 160, flex: "1 1 160px" }} variant="outlined">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
        <Typography
          variant="h5"
          sx={{ color: status ? STATUS_COLORS[status] : "inherit" }}
        >
          {value}
        </Typography>
      </Box>
      {(statusLabel || subtext) && (
        <Box sx={{ mt: 0.75 }}>
          {statusLabel && (
            <Typography
              variant="caption"
              sx={{
                color: status ? STATUS_COLORS[status] : "text.secondary",
                fontWeight: 600,
                display: "block",
              }}
            >
              {statusLabel}
            </Typography>
          )}
          {subtext && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {subtext}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
