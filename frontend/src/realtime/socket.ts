import { io, type Socket } from "socket.io-client";
import { resolveSocketUrl } from "../config/apiOrigin";

let socket: Socket | null = null;

export function getSocket() {
  if (socket) return socket;
  const url = resolveSocketUrl();
  socket = io(url, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}
