import { Request, Response, NextFunction } from "express";
import { SessionParticipantService } from "../modules/access/SessionParticipantService.js";

/**
 * Ensures the user can access the session (public join or private participant).
 * Sets req.gameSessionId from :id param.
 */
export async function requireSessionParticipant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.params.id ?? req.params.sessionId;
    const userId = (req as Request & { userId: string }).userId;
    if (!sessionId || !userId) {
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: "Некорректный запрос",
      });
    }
    await SessionParticipantService.assertCanAccessSession(sessionId, userId);
    const isParticipant = await SessionParticipantService.isParticipant(sessionId, userId);
    if (!isParticipant) {
      await SessionParticipantService.join(sessionId, userId);
    }
    (req as Request & { gameSessionId: string }).gameSessionId = sessionId;
    next();
  } catch (err) {
    next(err);
  }
}
