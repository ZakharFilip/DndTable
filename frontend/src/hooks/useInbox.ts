import { useCallback, useEffect, useState } from "react";
import type { InboxAction, InboxMessageDto } from "@dnd-table/shared";
import {
  actOnInboxMessage,
  getInboxMessages,
  getInboxUnreadCount,
  markAllInboxRead,
} from "../api/inbox";
import { getSocket } from "../realtime/socket";

export function useInbox() {
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([getInboxMessages(), getInboxUnreadCount()]);
      setMessages(listRes.data.messages);
      setUnreadCount(countRes.data.count);
    } catch {
      setMessages([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const socket = getSocket();
    const onUpdate = () => void refresh();
    socket.on("inbox:updated", onUpdate);
    return () => {
      socket.off("inbox:updated", onUpdate);
    };
  }, [refresh]);

  const act = useCallback(
    async (messageId: string, action: InboxAction) => {
      await actOnInboxMessage(messageId, action);
      await refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    const res = await markAllInboxRead();
    setUnreadCount(res.data.count);
    setMessages((prev) =>
      prev.map((m) => (m.status === "pending" ? { ...m, status: "read" as const } : m))
    );
  }, []);

  return { messages, unreadCount, loading, refresh, act, markAllRead };
}
