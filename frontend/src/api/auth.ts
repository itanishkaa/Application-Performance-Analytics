import { apiClient } from "./client";

export interface UserOut {
  id: string;
  email: string;
  created_at: string;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await apiClient.post<{
    access_token: string;
    token_type: string;
  }>("/auth/login", { email, password });
  return data.access_token;
}

export async function register(
  email: string,
  password: string,
): Promise<UserOut> {
  const { data } = await apiClient.post<UserOut>("/auth/register", {
    email,
    password,
  });
  return data;
}

export async function fetchCurrentUser(): Promise<UserOut> {
  const { data } = await apiClient.get<UserOut>("/auth/me");
  return data;
}
