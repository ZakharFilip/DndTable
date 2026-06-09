import type { AccessSnapshot, DiscoverSessionDto, ViewerContext } from "@dnd-table/shared";
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
  key?: string;
  type: string;
  x: number;
  y: number;
  sortOrder?: number;
  props: Record<string, unknown>;
  version?: number;
}

export interface SessionFullDto {
  session: GameSessionDto;
  state: { viewport: SessionViewportDto } | null;
  objects: TableObjectDto[];
  access?: AccessSnapshot;
  viewer?: ViewerContext;
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

export async function deleteSession(id: string) {
  const resp = await http.delete(`/api/sessions/${id}`);
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

export async function discoverSessions(params: {
  q?: string;
  onlyPublic?: boolean;
  unvisited?: boolean;
}): Promise<{ data: { mine: DiscoverSessionDto[]; others: DiscoverSessionDto[] } }> {
  const resp = await http.get("/api/sessions/discover", {
    params: {
      q: params.q,
      onlyPublic: params.onlyPublic ? "1" : undefined,
      unvisited: params.unvisited ? "1" : undefined,
    },
  });
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
    objects?: Array<{
      key?: string;
      version?: number;
      type: string;
      x?: number;
      y?: number;
      sortOrder?: number;
      props?: Record<string, unknown>;
    }>;
  }
) {
  const resp = await http.put(`/api/sessions/${id}/state`, payload);
  return resp.data;
}
