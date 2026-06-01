import type { RequestHandler } from "express";
import type { Socket } from "socket.io";

export type SocketWithUser = Socket & { data: { userId?: string } };

export function socketSessionMiddleware(sessionMiddleware: RequestHandler) {
  return (socket: Socket, next: (err?: Error) => void) => {
    const req = socket.request as Parameters<RequestHandler>[0];
    const res = {} as Parameters<RequestHandler>[1];
    sessionMiddleware(req, res, () => {
      const userId = (req.session as { userId?: string } | undefined)?.userId;
      if (!userId) {
        next(new Error("UNAUTHORIZED"));
        return;
      }
      (socket as SocketWithUser).data.userId = userId;
      next();
    });
  };
}
