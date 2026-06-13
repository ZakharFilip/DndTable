import { Router, type NextFunction, type Request, type Response } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../shared/requireAuth.js";
import { requireNotBanned } from "../../shared/requireNotBanned.js";
import { requireAdmin } from "../../shared/requireAdmin.js";
import { requireValidObjectId } from "../../shared/requireValidObjectId.js";
import { validate } from "../../shared/validate.js";
import { AdminService } from "./AdminService.js";

const router = Router();

router.use(requireAuth, requireNotBanned, requireAdmin);

router.get("/sessions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const sessions = await AdminService.listSessions(q);
    return res.json({ success: true, data: { sessions } });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/sessions/:id",
  requireValidObjectId("id"),
  [body("isBlocked").isBoolean().withMessage("isBlocked должно быть true/false")],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.setSessionBlocked(req.params.id, Boolean(req.body.isBlocked));
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/sessions/:id",
  requireValidObjectId("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AdminService.deleteSession(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const users = await AdminService.listUsers(q);
    return res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/users/:id",
  requireValidObjectId("id"),
  [body("isBanned").isBoolean().withMessage("isBanned должно быть true/false")],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.setUserBanned(req.params.id, Boolean(req.body.isBanned));
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/users/:id",
  requireValidObjectId("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AdminService.deleteUser(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
