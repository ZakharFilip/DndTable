import mongoose from "mongoose";
import { PermissionResolver } from "@dnd-table/shared";
import { HttpError } from "../../../shared/HttpError.js";
import { UserModel } from "../../users/user.model.js";
import { GameSessionModel } from "../game-session.model.js";
import { AccessSnapshotService } from "../../access/AccessSnapshotService.js";
import { SessionParticipantService } from "../../access/SessionParticipantService.js";
import { SessionInviteModel } from "./session-invite.model.js";

async function assertCanInvite(gameSessionId: string, fromUserId: string) {
  const session = await GameSessionModel.findById(gameSessionId).lean();
  if (!session) throw new HttpError(404, "NOT_FOUND", "Сессия не найдена");

  if (String(session.createdBy) === fromUserId) return session;

  const snapshot = await AccessSnapshotService.load(gameSessionId);
  if (!snapshot) {
    throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL не инициализирован");
  }
  const resolver = new PermissionResolver(snapshot);
  if (!resolver.hasPermission(fromUserId, "ModifyPermissions")) {
    throw new HttpError(403, "FORBIDDEN", "Недостаточно прав для приглашения");
  }
  return session;
}

export class SessionInviteService {
  static async send(gameSessionId: string, fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new HttpError(400, "BAD_REQUEST", "Нельзя пригласить себя");
    }

    const session = await assertCanInvite(gameSessionId, fromUserId);
    const target = await UserModel.findById(toUserId).lean();
    if (!target) throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");

    const existing = await SessionInviteModel.findOne({
      gameSessionId,
      toUserId,
      status: "pending",
    }).lean();
    if (existing) {
      throw new HttpError(409, "INVITE_EXISTS", "Приглашение уже отправлено");
    }

    const invite = await SessionInviteModel.create({
      gameSessionId,
      fromUserId,
      toUserId,
      status: "pending",
    });

    const fromUser = await UserModel.findById(fromUserId).select({ username: 1 }).lean();
    const { InboxService } = await import("../../inbox/InboxService.js");
    await InboxService.createSessionInvite({
      recipientId: toUserId,
      fromUserId,
      fromUsername: fromUser?.username ?? "Игрок",
      sessionId: gameSessionId,
      sessionName: session.name || "Сессия",
      inviteId: String(invite._id),
    });

    return { inviteId: String(invite._id) };
  }

  static async accept(inviteId: string, actorUserId: string) {
    const invite = await SessionInviteModel.findById(inviteId);
    if (!invite || invite.status !== "pending") {
      throw new HttpError(404, "NOT_FOUND", "Приглашение не найдено");
    }
    if (String(invite.toUserId) !== actorUserId) {
      throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
    }

    invite.status = "accepted";
    await invite.save();

    const sessionId = String(invite.gameSessionId);
    await SessionParticipantService.join(sessionId, actorUserId);

    const session = await GameSessionModel.findById(sessionId).lean();
    const accepter = await UserModel.findById(actorUserId).select({ username: 1 }).lean();
    const { InboxService } = await import("../../inbox/InboxService.js");
    await InboxService.createSessionInviteAccepted({
      recipientId: String(invite.fromUserId),
      fromUserId: actorUserId,
      fromUsername: accepter?.username ?? "Игрок",
      sessionName: session?.name ?? "Сессия",
    });
  }

  static async decline(inviteId: string, actorUserId: string) {
    const invite = await SessionInviteModel.findById(inviteId);
    if (!invite || invite.status !== "pending") {
      throw new HttpError(404, "NOT_FOUND", "Приглашение не найдено");
    }
    if (String(invite.toUserId) !== actorUserId) {
      throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
    }

    invite.status = "declined";
    await invite.save();

    const session = await GameSessionModel.findById(invite.gameSessionId).lean();
    const decliner = await UserModel.findById(actorUserId).select({ username: 1 }).lean();
    const { InboxService } = await import("../../inbox/InboxService.js");
    await InboxService.createSessionInviteDeclined({
      recipientId: String(invite.fromUserId),
      fromUserId: actorUserId,
      fromUsername: decliner?.username ?? "Игрок",
      sessionName: session?.name ?? "Сессия",
    });
  }

  static async listAcceptedSessionIds(userId: string): Promise<string[]> {
    const rows = await SessionInviteModel.find({
      toUserId: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    })
      .select({ gameSessionId: 1 })
      .lean();
    return rows.map((r) => String(r.gameSessionId));
  }
}
