import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../../../shared/requireAuth.js";
import { requireNotBanned } from "../../../shared/requireNotBanned.js";
import { requireSessionParticipant } from "../../../shared/requireSessionParticipant.js";
import { requireValidObjectId } from "../../../shared/requireValidObjectId.js";
import {
  createSessionSpriteUpload,
  sessionSpritePublicPath,
} from "./sessionSpriteUpload.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireNotBanned);

router.post(
  "/",
  requireValidObjectId("id"),
  requireSessionParticipant,
  (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.params.id;
    const upload = createSessionSpriteUpload(sessionId).single("sprite");
    upload(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : "UPLOAD_FAILED";
        if (msg === "INVALID_FILE_TYPE") {
          return res.status(400).json({
            success: false,
            error: "INVALID_FILE_TYPE",
            message: "Допустимы JPEG, PNG или WebP",
          });
        }
        return next(err);
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "NO_FILE",
          message: "Файл не получен",
        });
      }
      return res.json({
        success: true,
        data: {
          sprite: sessionSpritePublicPath(sessionId, file.filename),
        },
      });
    });
  }
);

export default router;
