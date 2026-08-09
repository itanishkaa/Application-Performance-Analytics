import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ServicesPage from "./pages/ServicesPage";
import EndpointsPage from "./pages/EndpointsPage";
import ReleasesPage from "./pages/ReleasesPage";
import IncidentsPage from "./pages/IncidentsPage";
import LogsPage from "./pages/LogsPage";
import AiPage from "./pages/AiPage";

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/dashboard"
              element={
                <Protected>
                  <DashboardPage />
                </Protected>
              }
            />
            <Route
              path="/services"
              element={
                <Protected>
                  <ServicesPage />
                </Protected>
              }
            />
            <Route
              path="/endpoints"
              element={
                <Protected>
                  <EndpointsPage />
                </Protected>
              }
            />
            <Route
              path="/releases"
              element={
                <Protected>
                  <ReleasesPage />
                </Protected>
              }
            />
            <Route
              path="/incidents"
              element={
                <Protected>
                  <IncidentsPage />
                </Protected>
              }
            />
            <Route
              path="/logs"
              element={
                <Protected>
                  <LogsPage />
                </Protected>
              }
            />
            <Route
              path="/ai"
              element={
                <Protected>
                  <AiPage />
                </Protected>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
