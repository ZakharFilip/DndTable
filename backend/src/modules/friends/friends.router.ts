import { Router, type NextFunction, type Request, type Response } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../shared/requireAuth.js";
import { requireNotBanned } from "../../shared/requireNotBanned.js";
import { validate } from "../../shared/validate.js";
import { requireValidObjectId } from "../../shared/requireValidObjectId.js";
import { FriendsService } from "./FriendsService.js";

const router = Router();

router.use(requireAuth, requireNotBanned);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const friends = await FriendsService.listFriends(userId);
    return res.json({ success: true, data: { friends } });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/request",
  [body("userId").notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const result = await FriendsService.sendRequest(userId, req.body.userId);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/request-by-code",
  [body("code").isLength({ min: 6, max: 6 })],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const result = await FriendsService.sendRequestByCode(userId, req.body.code);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:userId",
  requireValidObjectId("userId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await FriendsService.removeFriend(userId, req.params.userId);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
