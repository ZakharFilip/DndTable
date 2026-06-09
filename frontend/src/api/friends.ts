import type { FriendDto } from "@dnd-table/shared";
import http from "./http";

export async function getFriends(): Promise<{ data: { friends: FriendDto[] } }> {
  const resp = await http.get("/api/friends");
  return resp.data;
}

export async function sendFriendRequest(userId: string) {
  const resp = await http.post("/api/friends/request", { userId });
  return resp.data;
}

export async function sendFriendRequestByCode(code: string) {
  const resp = await http.post("/api/friends/request-by-code", { code });
  return resp.data;
}

export async function removeFriend(userId: string) {
  const resp = await http.delete(`/api/friends/${userId}`);
  return resp.data;
}
