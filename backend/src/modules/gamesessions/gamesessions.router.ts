import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { GameSessionModel } from "./game-session.model";
import { TableObjectModel } from "./table-object.model";
import { SessionStateModel } from "./session-state.model";
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

// GET /api/sessions/:id/full — загрузка сессии: метаданные, объекты на столе, состояние камеры
router.get("/:id/full", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: "Некорректный id сессии",
      });
    }

    const session = await GameSessionModel.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Сессия не найдена",
      });
    }

    const [objects, state] = await Promise.all([
      TableObjectModel.find({ gameSessionId: sessionId })
        .sort({ sortOrder: 1, _id: 1 })
        .lean(),
      SessionStateModel.findOne({ gameSessionId: sessionId }).lean(),
    ]);

    return res.json({
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
        state: state?.viewport
          ? { viewport: state.viewport }
          : null,
        objects: objects.map((o) => ({
          id: String(o._id),
          type: o.type,
          x: o.x,
          y: o.y,
          sortOrder: o.sortOrder ?? 0,
          props: o.props ?? {},
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/sessions/:id/state — сохранение состояния сессии (viewport + объекты на столе)
router.put(
  "/:id/state",
  [
    body("viewport").optional().isObject(),
    body("viewport.panX").optional().isNumeric(),
    body("viewport.panY").optional().isNumeric(),
    body("viewport.scale").optional().isNumeric(),
    body("objects").optional().isArray(),
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

      const sessionId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "Некорректный id сессии",
        });
      }

      const session = await GameSessionModel.findById(sessionId).lean();
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "NOT_FOUND",
          message: "Сессия не найдена",
        });
      }

      const viewport = req.body.viewport as { panX?: number; panY?: number; scale?: number } | undefined;
      const objects = (req.body.objects as Array<{ type: string; x: number; y: number; sortOrder?: number; props?: Record<string, unknown> }>) ?? [];

      const sessionOid = new mongoose.Types.ObjectId(sessionId);

      if (viewport !== undefined) {
        await SessionStateModel.updateOne(
          { gameSessionId: sessionOid },
          {
            $set: {
              gameSessionId: sessionOid,
              viewport: {
                panX: viewport.panX ?? 0,
                panY: viewport.panY ?? 0,
                scale: viewport.scale ?? 1,
              },
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      await TableObjectModel.deleteMany({ gameSessionId: sessionOid });
      if (objects.length > 0) {
        await TableObjectModel.insertMany(
          objects.map((o) => ({
            gameSessionId: sessionOid,
            type: o.type,
            x: o.x,
            y: o.y,
            sortOrder: o.sortOrder ?? 0,
            props: o.props ?? {},
          }))
        );
      }

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
