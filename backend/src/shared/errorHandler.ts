import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  // If service thrown structured error with .body and .status
  if (err && err.body) {
    return res.status(err.status || 500).json(err.body);
  }

  // Fallback generic
  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "Внутренняя ошибка сервера"
  });
}
