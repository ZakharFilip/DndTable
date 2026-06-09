import mongoose from "mongoose";
import type { InboxAction, InboxMessageDto } from "@dnd-table/shared";
import { HttpError } from "../../shared/HttpError.js";
import { InboxMessageModel } from "./models/inbox-message.model.js";
import { emitInboxUpdated } from "./emitInboxUpdated.js";

function toDto(doc: {
  _id: mongoose.Types.ObjectId;
  type: string;
  status: string;
  text: string;
  actionable: boolean;
  payload?: Record<string, unknown>;
  createdAt: Date;
}): InboxMessageDto {
  return {
    id: String(doc._id),
    type: doc.type as InboxMessageDto["type"],
    status: doc.status as InboxMessageDto["status"],
    text: doc.text,
    actionable: Boolean(doc.actionable),
    payload: (doc.payload as Record<string, unknown>) ?? {},
    createdAt: doc.createdAt.toISOString(),
  };
}

export class InboxService {
  static async unreadCount(userId: string): Promise<number> {
    return InboxMessageModel.countDocuments({
      recipientId: userId,
      status: "pending",
    });
  }

  static async list(userId: string, limit = 50): Promise<InboxMessageDto[]> {
    const rows = await InboxMessageModel.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return rows.map((r) =>
      toDto({
        _id: r._id as mongoose.Types.ObjectId,
        type: r.type,
        status: r.status,
        text: r.text,
        actionable: r.actionable,
        payload: r.payload as Record<string, unknown>,
        createdAt: r.createdAt as Date,
      })
    );
  }

  private static async createMessage(params: {
    recipientId: string;
    type: string;
    text: string;
    actionable: boolean;
    payload?: Record<string, unknown>;
  }) {
    const msg = await InboxMessageModel.create({
      recipientId: params.recipientId,
      type: params.type,
      text: params.text,
      actionable: params.actionable,
      payload: params.payload ?? {},
      status: "pending",
    });
    const count = await InboxService.unreadCount(params.recipientId);
    emitInboxUpdated(params.recipientId, count);
    return msg;
  }

  static async createFriendRequest(params: {
    recipientId: string;
    fromUserId: string;
    fromUsername: string;
    requestId: string;
  }) {
    await InboxService.createMessage({
      recipientId: params.recipientId,
      type: "friend_request",
      text: `${params.fromUsername} пригласил вас в друзья`,
      actionable: true,
      payload: {
        fromUserId: params.fromUserId,
        fromUsername: params.fromUsername,
        requestId: params.requestId,
      },
    });
  }

  static async createFriendAccepted(params: {
    recipientId: string;
    fromUserId: string;
    fromUsername: string;
  }) {
    await InboxService.createMessage({
      recipientId: params.recipientId,
      type: "friend_accepted",
      text: `${params.fromUsername} принял(а) ваше приглашение в друзья`,
      actionable: false,
      payload: { fromUserId: params.fromUserId, fromUsername: params.fromUsername },
    });
  }

  static async createFriendDeclined(params: {
    recipientId: string;
    fromUserId: string;
    fromUsername: string;
  }) {
    await InboxService.createMessage({
      recipientId: params.recipientId,
      type: "friend_declined",
      text: `${params.fromUsername} отклонил(а) ваше приглашение в друзья`,
      actionable: false,
      payload: { fromUserId: params.fromUserId, fromUsername: params.fromUsername },
    });
  }

  static async createSessionInvite(params: {
    recipientId: string;
    fromUserId: string;
    fromUsername: string;
    sessionId: string;
    sessionName: string;
    inviteId: string;
  }) {
    await InboxService.createMessage({
      recipientId: params.recipientId,
      type: "session_invite",
      text: `${params.fromUsername} пригласил вас в сессию «${params.sessionName}»`,
      actionable: true,
      payload: {
        fromUserId: params.fromUserId,
        fromUsername: params.fromUsername,
        sessionId: params.sessionId,
        sessionName: params.sessionName,
        inviteId: params.inviteId,
      },
    });
  }

  static async createSessionInviteAccepted(params: {
    recipientId: string;
    fromUserId: string;
    fromUsername: string;
    sessionName: string;
  }) {
    await InboxService.createMessage({
      recipientId: params.recipientId,
      type: "session_invite_accepted",
      text: `${params.fromUsername} принял(а) приглашение в сессию «${params.sessionName}»`,
      actionable: false,
      payload: { fromUserId: params.fromUserId, sessionName: params.sessionName },
    });
  }

  static async createSessionInviteDeclined(params: {
    recipientId: string;
    fromUserId: string;
    fromUsername: string;
    sessionName: string;
  }) {
    await InboxService.createMessage({
      recipientId: params.recipientId,
      type: "session_invite_declined",
      text: `${params.fromUsername} отклонил(а) приглашение в сессию «${params.sessionName}»`,
      actionable: false,
      payload: { fromUserId: params.fromUserId, sessionName: params.sessionName },
    });
  }

  static async act(messageId: string, userId: string, action: InboxAction) {
    const msg = await InboxMessageModel.findById(messageId);
    if (!msg || String(msg.recipientId) !== userId) {
      throw new HttpError(404, "NOT_FOUND", "Сообщение не найдено");
    }
    if (msg.status === "acted") {
      throw new HttpError(409, "ALREADY_ACTED", "Действие уже выполнено");
    }
    if (!msg.actionable) {
      throw new HttpError(400, "NOT_ACTIONABLE", "Сообщение не требует действия");
    }

    const payload = (msg.payload ?? {}) as Record<string, unknown>;

    if (msg.type === "friend_request") {
      const requestId = String(payload.requestId ?? "");
      const { FriendsService } = await import("../friends/FriendsService.js");
      if (action === "accept") {
        await FriendsService.acceptRequest(requestId, userId);
      } else {
        await FriendsService.declineRequest(requestId, userId);
      }
    } else if (msg.type === "session_invite") {
      const inviteId = String(payload.inviteId ?? "");
      const { SessionInviteService } = await import(
        "../gamesessions/session-invites/SessionInviteService.js"
      );
      if (action === "accept") {
        await SessionInviteService.accept(inviteId, userId);
      } else {
        await SessionInviteService.decline(inviteId, userId);
      }
    } else {
      throw new HttpError(400, "BAD_REQUEST", "Неизвестный тип сообщения");
    }

    msg.status = "acted";
    await msg.save();
    const count = await InboxService.unreadCount(userId);
    emitInboxUpdated(userId, count);

    return { success: true };
  }
}
