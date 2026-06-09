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

export async function uploadAvatar(file: File): Promise<{ data: { avatar: string } }> {
  const form = new FormData();
  form.append("avatar", file);
  const resp = await http.post("/api/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return resp.data;
}
