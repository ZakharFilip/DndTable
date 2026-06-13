import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { requireAuth } from "../../shared/requireAuth.js";
import { requireNotBanned } from "../../shared/requireNotBanned.js";
import { requireSessionParticipant } from "../../shared/requireSessionParticipant.js";
import { requireValidObjectId } from "../../shared/requireValidObjectId.js";
import { validate } from "../../shared/validate.js";
import { PermissionSchema } from "@dnd-table/shared";
import { TeamsService, GrantsService } from "./TeamsService.js";
import { GameSessionsService } from "../gamesessions/gamesessions.service.js";
import { emitAccessChanged } from "./emitAccessChanged.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireNotBanned);
router.use(requireValidObjectId("id"));
router.use(requireSessionParticipant);

// GET snapshot (alias)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const data = await GameSessionsService.getAccess(req.params.id, userId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/teams",
  [body("name").trim().notEmpty(), body("parentTeamId").optional({ nullable: true })],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const team = await TeamsService.createTeam(req.params.id, userId, {
        name: req.body.name,
        parentTeamId: req.body.parentTeamId ?? null,
      });
      emitAccessChanged(req.params.id);
      return res.status(201).json({ success: true, data: { team } });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/teams/:teamId",
  requireValidObjectId("teamId"),
  [body("name").optional().trim().notEmpty(), body("isDefaultForNewUsers").optional().isBoolean()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const team = await TeamsService.updateTeam(req.params.id, userId, req.params.teamId, {
        name: req.body.name,
        isDefaultForNewUsers: req.body.isDefaultForNewUsers,
      });
      emitAccessChanged(req.params.id);
      return res.json({ success: true, data: { team } });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/teams/:teamId",
  requireValidObjectId("teamId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await TeamsService.deleteTeam(req.params.id, userId, req.params.teamId);
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/teams/:teamId/parent",
  requireValidObjectId("teamId"),
  [body("parentTeamId").optional({ nullable: true })],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await TeamsService.setParentTeam(
        req.params.id,
        userId,
        req.params.teamId,
        req.body.parentTeamId ?? null
      );
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/teams/:teamId/members",
  requireValidObjectId("teamId"),
  [body("userId").notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await TeamsService.addUserToTeam(
        req.params.id,
        userId,
        req.params.teamId,
        req.body.userId
      );
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/teams/:teamId/members/:memberUserId",
  requireValidObjectId("teamId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await TeamsService.removeUserFromTeam(
        req.params.id,
        userId,
        req.params.teamId,
        req.params.memberUserId
      );
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/grants/global",
  [
    body("teamId").notEmpty(),
    body("permission").custom((v) => PermissionSchema.safeParse(v).success),
    body("value").custom((v) => v === null || v === "Allow" || v === "Deny"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await GrantsService.setGlobalGrant(req.params.id, userId, {
        teamId: req.body.teamId,
        permission: req.body.permission,
        value: req.body.value,
      });
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/grants/object-permission",
  [
    body("objectKey").notEmpty(),
    body("teamId").notEmpty(),
    body("permission").custom((v) => PermissionSchema.safeParse(v).success),
    body("value").custom((v) => v === null || v === "Allow" || v === "Deny"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await GrantsService.setObjectPermissionGrant(req.params.id, userId, req.body);
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/grants/object-visibility",
  [
    body("objectKey").notEmpty(),
    body("teamId").notEmpty(),
    body("value").custom((v) => v === null || v === "Visible" || v === "Hidden"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      await GrantsService.setObjectVisibilityGrant(req.params.id, userId, req.body);
      emitAccessChanged(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
