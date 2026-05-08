import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({
    field: "path" in e ? (e as { path: string }).path : "unknown",
    message: e.msg,
  }));
  return res.status(400).json({
    success: false,
    error: "VALIDATION_ERROR",
    message: "Ошибка валидации данных",
    details,
  });
}
