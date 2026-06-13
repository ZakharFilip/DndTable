import { Router, Request, Response, NextFunction } from "express";
import { body, CustomValidator } from "express-validator";
import { hasDangerousContent } from "../../shared/safeText.js";
import { requireAuth } from "../../shared/requireAuth";
import { requireNotBanned } from "../../shared/requireNotBanned.js";
import { requireSessionParticipant } from "../../shared/requireSessionParticipant";
import { validate } from "../../shared/validate";
import { requireValidObjectId } from "../../shared/requireValidObjectId";
import { GameSessionsService, type IncomingTableObject } from "./gamesessions.service";
import type { TablePatchOp } from "./table-patch";
import { getIoInstance } from "../../shared/io";

const router = Router();

const noDangerousContent: CustomValidator = (value) => {
  if (typeof value !== "string") return true;
  if (hasDangerousContent(value)) {
    throw new Error("Поле содержит недопустимые символы");
  }
  return true;
};

router.use(requireAuth, requireNotBanned);

// POST /api/sessions — создать сессию
router.post(
  "/",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Название обязательно")
      .isLength({ max: 100 })
      .withMessage("Название не длиннее 100 символов")
      .custom(noDangerousContent),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Описание не длиннее 200 символов")
      .custom(noDangerousContent),
    body("isPrivate").optional().isBoolean().withMessage("isPrivate должно быть true/false"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const session = await GameSessionsService.createSession(userId, {
        name: req.body.name,
        description: req.body.description,
        isPrivate: req.body.isPrivate,
      });
      return res.status(201).json({ success: true, data: { session } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/sessions — мои сессии
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const sessions = await GameSessionsService.listMy(userId);
    return res.json({ success: true, data: { sessions } });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/discover — мои + публичные с фильтрами
router.get("/discover", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const onlyPublic = req.query.onlyPublic === "true" || req.query.onlyPublic === "1";
    const unvisited = req.query.unvisited === "true" || req.query.unvisited === "1";
    const data = await GameSessionsService.listDiscover(userId, { q, onlyPublic, unvisited });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/public — публичные сессии
router.get("/public", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await GameSessionsService.listPublic();
    return res.json({ success: true, data: { sessions } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sessions/:id — удалить сессию (только создатель)
router.delete(
  "/:id",
  requireValidObjectId("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await GameSessionsService.deleteSession(req.params.id, userId);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/sessions/:id/join — войти в сессию (участник + команда по умолчанию)
router.post(
  "/:id/join",
  requireValidObjectId("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const result = await GameSessionsService.joinSession(req.params.id, userId);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/sessions/:id/access — снимок ACL
router.get(
  "/:id/access",
  requireValidObjectId("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const data = await GameSessionsService.getAccess(req.params.id, userId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/sessions/:id/full — полная загрузка сессии
router.get(
  "/:id/full",
  requireValidObjectId("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const data = await GameSessionsService.getFull(req.params.id, userId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/sessions/:id/patch — применить патчи (LWW)
router.post(
  "/:id/patch",
  requireValidObjectId("id"),
  requireSessionParticipant,
  [body("clientId").isString().notEmpty(), body("ops").isArray()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id;
      const userId = (req as Request & { userId: string }).userId;
      const clientId = String(req.body.clientId);
      const ops = req.body.ops as TablePatchOp[];

      const result = await GameSessionsService.applyPatch(sessionId, ops, userId);
      if (result.conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          error: "VERSION_CONFLICT",
          message: "Конфликт версий",
          conflicts: result.conflicts,
        });
      }

      const io = getIoInstance();
      io?.to(`table:${sessionId}`).emit("table:patchApplied", {
        tableId: sessionId,
        clientId,
        applied: result.applied,
      });

      return res.json({ success: true, applied: result.applied });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/sessions/:id/state — сохранение состояния
router.put(
  "/:id/state",
  requireValidObjectId("id"),
  requireSessionParticipant,
  [
    body("viewport").optional().isObject(),
    body("viewport.panX").optional().isNumeric(),
    body("viewport.panY").optional().isNumeric(),
    body("viewport.scale").optional().isNumeric(),
    body("objects").optional().isArray(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await GameSessionsService.saveState(
        req.params.id,
        {
          viewport: req.body.viewport,
          objects: req.body.objects as IncomingTableObject[] | undefined,
        },
        userId
      );
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
