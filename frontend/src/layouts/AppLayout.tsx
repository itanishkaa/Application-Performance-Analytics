import {
  AppBar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DnsIcon from "@mui/icons-material/Dns";
import ApiIcon from "@mui/icons-material/Api";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArticleIcon from "@mui/icons-material/Article";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import LogoutIcon from "@mui/icons-material/Logout";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Overview", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Services", path: "/services", icon: <DnsIcon /> },
  { label: "Endpoints", path: "/endpoints", icon: <ApiIcon /> },
  { label: "Releases", path: "/releases", icon: <RocketLaunchIcon /> },
  { label: "Incidents", path: "/incidents", icon: <WarningAmberIcon /> },
  { label: "Logs", path: "/logs", icon: <ArticleIcon /> },
  { label: "AI Analyst", path: "/ai", icon: <SmartToyIcon /> },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" noWrap>
            PulseOps
          </Typography>
          {user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2">{user.email}</Typography>
              <ListItemButton
                onClick={logout}
                sx={{ width: "auto", borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: 1, color: "inherit" }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <List>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={location.pathname.startsWith(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
