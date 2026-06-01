import { getIoInstance } from "../../shared/io.js";

export function emitAccessChanged(gameSessionId: string) {
  const io = getIoInstance();
  io?.to(`table:${gameSessionId}`).emit("access:changed", { tableId: gameSessionId });
}
