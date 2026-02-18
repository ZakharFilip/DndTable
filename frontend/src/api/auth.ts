import http from "./http";

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { email: string; password: string; username: string; }

export async function login(payload: LoginPayload) {
  const resp = await http.post("/auth/login", payload);
  return resp.data;
}

export async function register(payload: RegisterPayload) {
  const resp = await http.post("/auth/register", payload);
  return resp.data;
}

export async function me() {
  const resp = await http.get("/auth/me");
  return resp.data;
}

export async function logout() {
  const resp = await http.post("/auth/logout");
  return resp.data;
}
