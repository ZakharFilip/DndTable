import type { AdminSessionDto, AdminUserDto } from "@dnd-table/shared";
import http from "./http";

export async function getAdminSessions(q?: string) {
  const resp = await http.get("/api/admin/sessions", { params: q ? { q } : {} });
  return resp.data as { success: boolean; data: { sessions: AdminSessionDto[] } };
}

export async function setAdminSessionBlocked(sessionId: string, isBlocked: boolean) {
  const resp = await http.patch(`/api/admin/sessions/${sessionId}`, { isBlocked });
  return resp.data;
}

export async function deleteAdminSession(sessionId: string) {
  const resp = await http.delete(`/api/admin/sessions/${sessionId}`);
  return resp.data;
}

export async function getAdminUsers(q?: string) {
  const resp = await http.get("/api/admin/users", { params: q ? { q } : {} });
  return resp.data as { success: boolean; data: { users: AdminUserDto[] } };
}

export async function setAdminUserBanned(userId: string, isBanned: boolean) {
  const resp = await http.patch(`/api/admin/users/${userId}`, { isBanned });
  return resp.data;
}

export async function deleteAdminUser(userId: string) {
  const resp = await http.delete(`/api/admin/users/${userId}`);
  return resp.data;
}
