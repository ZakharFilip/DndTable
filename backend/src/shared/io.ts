import type { Server } from "socket.io";

let io: Server | null = null;

export function setIoInstance(instance: Server) {
  io = instance;
}

export function getIoInstance() {
  return io;
}

