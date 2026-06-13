import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../modules/users/user.model.js";
import { isAdminEmail } from "./adminEmail.js";

export async function requireNotBanned(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const user = await UserModel.findById(userId).select("email isBanned").lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Необходима авторизация",
      });
    }
    if (user.isBanned && !isAdminEmail(user.email)) {
      return res.status(403).json({
        success: false,
        error: "USER_BANNED",
        message: "Аккаунт заблокирован",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}
