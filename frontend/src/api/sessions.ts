import http from "./http";

export interface GameSessionDto {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SessionViewportDto {
  panX: number;
  panY: number;
  scale: number;
}

export interface TableObjectDto {
  id: string;
  type: string;
  x: number;
  y: number;
  sortOrder?: number;
  props: Record<string, unknown>;
}

export interface SessionFullDto {
  session: GameSessionDto;
  state: { viewport: SessionViewportDto } | null;
  objects: TableObjectDto[];
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

export async function getSessionFull(id: string): Promise<{ data: SessionFullDto }> {
  const resp = await http.get(`/api/sessions/${id}/full`);
  return resp.data;
}

export async function saveSessionState(
  id: string,
  payload: {
    viewport?: SessionViewportDto;
    objects?: Array<{ type: string; x: number; y: number; sortOrder?: number; props?: Record<string, unknown> }>;
  }
) {
  const resp = await http.put(`/api/sessions/${id}/state`, payload);
  return resp.data;
}
