import { ReactNode } from "react";
import { Paper, Typography, Box } from "@mui/material";

interface DashboardPanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  minHeight?: number;
}

export function DashboardPanel({
  title,
  action,
  children,
  minHeight = 220,
}: DashboardPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, display: "flex", flexDirection: "column", minHeight }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
        {action}
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Paper>
  );
}
