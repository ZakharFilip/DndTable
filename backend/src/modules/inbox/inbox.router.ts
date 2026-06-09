import { Router, type NextFunction, type Request, type Response } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../shared/requireAuth.js";
import { requireValidObjectId } from "../../shared/requireValidObjectId.js";
import { validate } from "../../shared/validate.js";
import { InboxService } from "./InboxService.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const messages = await InboxService.list(userId);
    return res.json({ success: true, data: { messages } });
  } catch (err) {
    next(err);
  }
});

router.get("/unread-count", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const count = await InboxService.unreadCount(userId);
    return res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

router.post("/mark-all-read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const count = await InboxService.markAllRead(userId);
    return res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/act",
  requireValidObjectId("id"),
  [body("action").isIn(["accept", "decline"])],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const result = await InboxService.act(
        req.params.id,
        userId,
        req.body.action as "accept" | "decline"
      );
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
