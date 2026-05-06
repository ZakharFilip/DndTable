import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SOCKET_BASE || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}

