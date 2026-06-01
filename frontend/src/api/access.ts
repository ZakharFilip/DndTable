import type { AccessSnapshot, Permission, ViewerContext } from "@dnd-table/shared";
import http from "./http";

export async function joinSession(sessionId: string) {
  const resp = await http.post(`/api/sessions/${sessionId}/join`);
  return resp.data as {
    success: boolean;
    data: { access: AccessSnapshot; viewer: ViewerContext };
  };
}

export async function getSessionAccess(sessionId: string) {
  const resp = await http.get(`/api/sessions/${sessionId}/access`);
  return resp.data as {
    success: boolean;
    data: { access: AccessSnapshot; viewer: ViewerContext };
  };
}

export async function createTeam(
  sessionId: string,
  payload: { name: string; parentTeamId?: string | null }
) {
  const resp = await http.post(`/api/sessions/${sessionId}/access/teams`, payload);
  return resp.data;
}

export async function deleteTeam(sessionId: string, teamId: string) {
  const resp = await http.delete(`/api/sessions/${sessionId}/access/teams/${teamId}`);
  return resp.data;
}

export async function setTeamParent(
  sessionId: string,
  teamId: string,
  parentTeamId: string | null
) {
  const resp = await http.put(`/api/sessions/${sessionId}/access/teams/${teamId}/parent`, {
    parentTeamId,
  });
  return resp.data;
}

export async function updateTeam(
  sessionId: string,
  teamId: string,
  payload: { name?: string; isDefaultForNewUsers?: boolean }
) {
  const resp = await http.patch(`/api/sessions/${sessionId}/access/teams/${teamId}`, payload);
  return resp.data;
}

export async function addTeamMember(sessionId: string, teamId: string, userId: string) {
  const resp = await http.post(`/api/sessions/${sessionId}/access/teams/${teamId}/members`, {
    userId,
  });
  return resp.data;
}

export async function removeTeamMember(sessionId: string, teamId: string, userId: string) {
  const resp = await http.delete(
    `/api/sessions/${sessionId}/access/teams/${teamId}/members/${userId}`
  );
  return resp.data;
}

export async function setGlobalGrant(
  sessionId: string,
  payload: { teamId: string; permission: Permission; value: "Allow" | "Deny" | null }
) {
  const resp = await http.put(`/api/sessions/${sessionId}/access/grants/global`, payload);
  return resp.data;
}

export async function setObjectPermissionGrant(
  sessionId: string,
  payload: {
    objectKey: string;
    teamId: string;
    permission: Permission;
    value: "Allow" | "Deny" | null;
  }
) {
  const resp = await http.put(`/api/sessions/${sessionId}/access/grants/object-permission`, payload);
  return resp.data;
}

export async function setObjectVisibilityGrant(
  sessionId: string,
  payload: { objectKey: string; teamId: string; value: "Visible" | "Hidden" | null }
) {
  const resp = await http.put(`/api/sessions/${sessionId}/access/grants/object-visibility`, payload);
  return resp.data;
}
