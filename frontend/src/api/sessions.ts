import http from "./http";

export interface GameSessionDto {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateSessionPayload {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export async function createSession(payload: CreateSessionPayload) {
  const resp = await http.post("/api/sessions", payload);
  return resp.data;
}

export async function getMySessions(): Promise<{ data: { sessions: GameSessionDto[] } }> {
  const resp = await http.get("/api/sessions");
  return resp.data;
}

export async function getPublicSessions(): Promise<{ data: { sessions: (GameSessionDto & { createdBy?: string })[] } }> {
  const resp = await http.get("/api/sessions/public");
  return resp.data;
}
