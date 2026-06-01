import { Request, Response, NextFunction } from "express";
import type { Permission } from "@dnd-table/shared";
import { PermissionResolver } from "@dnd-table/shared";
import { AccessSnapshotService } from "../AccessSnapshotService.js";
import { HttpError } from "../../../shared/HttpError.js";

export function requirePermission(permission: Permission, objectKeyParam?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId =
        (req as Request & { gameSessionId?: string }).gameSessionId ?? req.params.id;
      const userId = (req as Request & { userId: string }).userId;
      if (!sessionId || !userId) {
        throw new HttpError(400, "BAD_REQUEST", "Некорректный запрос");
      }
      const snapshot = await AccessSnapshotService.load(sessionId);
      if (!snapshot) {
        throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL не инициализирован");
      }
      const objectKey = objectKeyParam ? req.params[objectKeyParam] : undefined;
      const resolver = new PermissionResolver(snapshot);
      if (!resolver.hasPermission(userId, permission, objectKey)) {
        throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
