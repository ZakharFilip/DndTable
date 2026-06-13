import { Router, type NextFunction, type Request, type Response } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../../shared/requireAuth.js";
import { requireNotBanned } from "../../../shared/requireNotBanned.js";
import { requireValidObjectId } from "../../../shared/requireValidObjectId.js";
import { validate } from "../../../shared/validate.js";
import { SessionParticipantService } from "../../access/SessionParticipantService.js";
import { SessionInviteService } from "./SessionInviteService.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireNotBanned);
router.use(requireValidObjectId("id"));

router.post(
  "/",
  [body("userId").notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const sessionId = req.params.id;
      await SessionParticipantService.assertCanAccessSession(sessionId, userId);
      const result = await SessionInviteService.send(sessionId, userId, req.body.userId);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
