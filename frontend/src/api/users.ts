import type { UserSearchResult } from "@dnd-table/shared";
import http from "./http";

export async function searchUsers(q: string): Promise<{ data: { users: UserSearchResult[] } }> {
  const resp = await http.get("/api/users/search", { params: { q } });
  return resp.data;
}

export async function getUserMe() {
  const resp = await http.get("/api/users/me");
  return resp.data;
}
