import { getIoInstance } from "../../shared/io.js";

export function emitInboxUpdated(userId: string, unreadCount?: number) {
  const io = getIoInstance();
  io?.to(`user:${userId}`).emit("inbox:updated", { userId, unreadCount });
}
