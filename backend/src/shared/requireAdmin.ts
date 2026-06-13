import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../modules/users/user.model.js";
import { isAdminEmail } from "./adminEmail.js";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const user = await UserModel.findById(userId).select("email").lean();
    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Доступ только для администратора",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}
