import http from "./http";

export async function sendSessionInvite(sessionId: string, userId: string) {
  const resp = await http.post(`/api/sessions/${sessionId}/invites`, { userId });
  return resp.data;
}
