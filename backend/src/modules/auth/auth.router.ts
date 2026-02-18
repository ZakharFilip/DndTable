import { Router, type NextFunction, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthService } from "./auth.service";
import { UserModel } from "../users/user.model";

const router = Router();

// POST /auth/register
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Неправильный формат почты"),
    body("password").isLength({ min: 8 }).withMessage("Пароль должен быть не короче 8 символов"),
    body("username").isLength({ min: 5 }).withMessage("Никнейм должен быть не короче 5 символов")
      .matches(/^[A-Za-z0-9_]+$/).withMessage("Никнейм должен содержать только буквы, цифры и подчеркивание")
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((e) => ({
          field: "path" in e ? e.path : "unknown",
          message: e.msg,
        }));
        return res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Ошибка валидации данных",
          details
        });
      }

      const payload = {
        email: req.body.email,
        password: req.body.password,
        username: req.body.username
      };
      const result = await AuthService.register(payload);
      if (result?.success) {
        req.session.userId = result.data.user.id;
      }
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Неправильный формат почты"),
    body("password").isLength({ min: 8 }).withMessage("Пароль должен быть не короче 8 символов")
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((e) => ({
          field: "path" in e ? e.path : "unknown",
          message: e.msg,
        }));
        return res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Ошибка валидации данных",
          details
        });
      }

      const payload = { email: req.body.email, password: req.body.password };
      const result = await AuthService.login(payload);
      if (result?.success) {
        req.session.userId = result.data.user.id;
      }
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /auth/me
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Необходима авторизация",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Сессия недействительна",
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "dnd.sid";
    req.session.destroy((err: any) => {
      if (err) return next(err);
      res.clearCookie(cookieName);
      res.json({ success: true });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
