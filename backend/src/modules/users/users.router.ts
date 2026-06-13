import { Router, type NextFunction, type Request, type Response } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../shared/requireAuth.js";
import { requireNotBanned } from "../../shared/requireNotBanned.js";
import { validate } from "../../shared/validate.js";
import { UserSearchService } from "./UserSearchService.js";
import { UserModel } from "./user.model.js";
import { avatarUpload, deleteAvatarFile } from "./avatarUpload.js";
import { HttpError } from "../../shared/HttpError.js";
import { toPublicUser } from "../../shared/userPublicDto.js";
import { UserDeletionService } from "./UserDeletionService.js";

const router = Router();

router.use(requireAuth, requireNotBanned);

router.get(
  "/search",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const users = await UserSearchService.search(q, userId);
      return res.json({ success: true, data: { users } });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    return res.json({
      success: true,
      data: {
        user: toPublicUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/me",
  [body("confirmUsername").isString().trim().notEmpty().withMessage("Укажите никнейм для подтверждения")],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");
      }
      const confirmUsername = String(req.body.confirmUsername).trim();
      if (confirmUsername !== user.username) {
        throw new HttpError(400, "VALIDATION_ERROR", "Никнейм не совпадает", {
          field: "confirmUsername",
        });
      }

      await UserDeletionService.deleteUser(userId, { allowAdmin: true });

      const cookieName = process.env.SESSION_COOKIE_NAME || "dnd.sid";
      req.session.destroy((err: unknown) => {
        if (err) return next(err);
        res.clearCookie(cookieName);
        return res.json({ success: true });
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/me/avatar",
  avatarUpload.single("avatar"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      if (!req.file) {
        throw new HttpError(400, "VALIDATION_ERROR", "Файл не загружен");
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");
      }

      const oldAvatar = user.avatar;
      user.avatar = req.file.filename;
      await user.save();
      deleteAvatarFile(oldAvatar);

      return res.json({
        success: true,
        data: {
          avatar: user.avatar,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
