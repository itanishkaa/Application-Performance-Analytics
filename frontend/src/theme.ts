import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3b82f6" },
    background: {
      default: "#0f1115",
      paper: "#171a21",
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ].join(","),
  },
});
