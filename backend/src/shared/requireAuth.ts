import { Request, Response, NextFunction } from "express";

export interface SessionWithUserId {
  userId?: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as SessionWithUserId).userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Необходима авторизация",
    });
  }
  (req as Request & { userId: string }).userId = userId;
  next();
}
