import { Chip } from "@mui/material";

const COLOR_MAP: Record<string, "success" | "warning" | "error" | "default"> = {
  Healthy: "success",
  Degraded: "warning",
  Critical: "error",
  Unknown: "default",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <Chip label={status} color={COLOR_MAP[status] ?? "default"} size="small" />
  );
}
