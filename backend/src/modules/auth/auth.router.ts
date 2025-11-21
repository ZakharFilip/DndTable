import { Router } from "express";
import { body, validationResult } from "express-validator";
import { AuthService } from "./auth.service";

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
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map(e => ({ field: e.param, message: e.msg }));
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
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map(e => ({ field: e.param, message: e.msg }));
        return res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Ошибка валидации данных",
          details
        });
      }

      const payload = { email: req.body.email, password: req.body.password };
      const result = await AuthService.login(payload);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
