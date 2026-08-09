import axios from "axios";

const TOKEN_STORAGE_KEY = "pulseops_token";

export const apiClient = axios.create({
  baseURL: "/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Full reload is simplest for an MVP — the auth context re-checks
      // localStorage on mount and will redirect to /login.
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
