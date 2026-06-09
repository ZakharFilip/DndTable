import type { InboxAction, InboxMessageDto } from "@dnd-table/shared";
import http from "./http";

export async function getInboxMessages(): Promise<{ data: { messages: InboxMessageDto[] } }> {
  const resp = await http.get("/api/inbox");
  return resp.data;
}

export async function getInboxUnreadCount(): Promise<{ data: { count: number } }> {
  const resp = await http.get("/api/inbox/unread-count");
  return resp.data;
}

export async function actOnInboxMessage(messageId: string, action: InboxAction) {
  const resp = await http.post(`/api/inbox/${messageId}/act`, { action });
  return resp.data;
}
