import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { GameSessionModel } from "./game-session.model";
import { requireAuth } from "../../shared/requireAuth";

const router = Router();

router.use(requireAuth);

// POST /api/sessions — создать сессию (авторизованный пользователь)
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Название обязательно"),
    body("description").optional().trim(),
    body("isPrivate").optional().isBoolean().withMessage("isPrivate должно быть true/false"),
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
          details,
        });
      }

      const userId = (req as Request & { userId: string }).userId;
      const { name, description, isPrivate } = req.body;

      const session = await GameSessionModel.create({
        name: name || "",
        description: description ?? "",
        isPrivate: Boolean(isPrivate),
        createdBy: userId,
      });

      return res.status(201).json({
        success: true,
        data: {
          session: {
            id: String(session._id),
            name: session.name,
            description: session.description,
            isPrivate: session.isPrivate,
            createdBy: String(session.createdBy),
            createdAt: session.createdAt,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/sessions — мои сессии (созданные текущим пользователем)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;

    const list = await GameSessionModel.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        sessions: list.map((s) => ({
          id: String(s._id),
          name: s.name,
          description: s.description,
          isPrivate: s.isPrivate,
          createdBy: String(s.createdBy),
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/public — публичные сессии (для страницы «Присоединиться»)
router.get("/public", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await GameSessionModel.find({ isPrivate: false })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        sessions: list.map((s) => ({
          id: String(s._id),
          name: s.name,
          description: s.description,
          isPrivate: s.isPrivate,
          createdBy: typeof s.createdBy === "object" && s.createdBy && "username" in s.createdBy
            ? (s.createdBy as { username: string }).username
            : String(s.createdBy),
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
