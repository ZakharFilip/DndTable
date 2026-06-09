import mongoose from "mongoose";
import type { FriendDto } from "@dnd-table/shared";
import { HttpError } from "../../shared/HttpError.js";
import { UserModel } from "../users/user.model.js";
import { FriendRequestModel } from "./models/friend-request.model.js";
import { FriendshipModel, canonicalPair } from "./models/friendship.model.js";

export class FriendsService {
  static async areFriends(userId: string, otherId: string): Promise<boolean> {
    const [userA, userB] = canonicalPair(userId, otherId);
    const f = await FriendshipModel.findOne({
      userA: new mongoose.Types.ObjectId(userA),
      userB: new mongoose.Types.ObjectId(userB),
    }).lean();
    return Boolean(f);
  }

  static async listFriends(userId: string): Promise<FriendDto[]> {
    const oid = new mongoose.Types.ObjectId(userId);
    const links = await FriendshipModel.find({
      $or: [{ userA: oid }, { userB: oid }],
    }).lean();

    const friendIds = links.map((l) =>
      String(l.userA) === userId ? String(l.userB) : String(l.userA)
    );
    if (friendIds.length === 0) return [];

    const users = await UserModel.find({ _id: { $in: friendIds } })
      .select({ username: 1, avatar: 1, friendCode: 1 })
      .lean();

    return users
      .map((u) => ({
        userId: String(u._id),
        username: u.username,
        avatar: u.avatar ?? "default-avatar.png",
        friendCode: u.friendCode,
      }))
      .sort((a, b) => a.username.localeCompare(b.username, "ru"));
  }

  static async sendRequest(fromId: string, toUserId: string, options?: { skipInbox?: boolean }) {
    if (fromId === toUserId) {
      throw new HttpError(400, "BAD_REQUEST", "Нельзя добавить себя в друзья");
    }

    const target = await UserModel.findById(toUserId).lean();
    if (!target) {
      throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");
    }

    if (await FriendsService.areFriends(fromId, toUserId)) {
      throw new HttpError(409, "ALREADY_FRIENDS", "Вы уже друзья");
    }

    const existing = await FriendRequestModel.findOne({
      fromUserId: fromId,
      toUserId,
      status: "pending",
    }).lean();
    if (existing) {
      throw new HttpError(409, "REQUEST_EXISTS", "Заявка уже отправлена");
    }

    const reverse = await FriendRequestModel.findOne({
      fromUserId: toUserId,
      toUserId: fromId,
      status: "pending",
    }).lean();
    if (reverse) {
      throw new HttpError(409, "REVERSE_REQUEST", "У вас уже есть входящая заявка от этого пользователя");
    }

    const req = await FriendRequestModel.create({
      fromUserId: fromId,
      toUserId,
      status: "pending",
    });

    if (!options?.skipInbox) {
      const { InboxService } = await import("../inbox/InboxService.js");
      const fromUser = await UserModel.findById(fromId).select({ username: 1 }).lean();
      await InboxService.createFriendRequest({
        recipientId: toUserId,
        fromUserId: fromId,
        fromUsername: fromUser?.username ?? "Игрок",
        requestId: String(req._id),
      });
    }

    return { requestId: String(req._id) };
  }

  static async sendRequestByCode(fromId: string, code: string) {
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw new HttpError(400, "INVALID_CODE", "Код должен состоять из 6 цифр");
    }
    const user = await UserModel.findOne({ friendCode: normalized }).lean();
    if (!user) {
      throw new HttpError(404, "NOT_FOUND", "Пользователь с таким кодом не найден");
    }
    return FriendsService.sendRequest(fromId, String(user._id));
  }

  static async acceptRequest(requestId: string, actorUserId: string) {
    const req = await FriendRequestModel.findById(requestId);
    if (!req || req.status !== "pending") {
      throw new HttpError(404, "NOT_FOUND", "Заявка не найдена");
    }
    if (String(req.toUserId) !== actorUserId) {
      throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
    }

    req.status = "accepted";
    await req.save();

    const fromId = String(req.fromUserId);
    const toId = String(req.toUserId);
    const [userA, userB] = canonicalPair(fromId, toId);
    await FriendshipModel.updateOne(
      { userA, userB },
      { $setOnInsert: { userA, userB } },
      { upsert: true }
    );

    const accepter = await UserModel.findById(toId).select({ username: 1 }).lean();
    const { InboxService } = await import("../inbox/InboxService.js");
    await InboxService.createFriendAccepted({
      recipientId: fromId,
      fromUserId: toId,
      fromUsername: accepter?.username ?? "Игрок",
    });

    return { fromUserId: fromId, toUserId: toId };
  }

  static async declineRequest(requestId: string, actorUserId: string) {
    const req = await FriendRequestModel.findById(requestId);
    if (!req || req.status !== "pending") {
      throw new HttpError(404, "NOT_FOUND", "Заявка не найдена");
    }
    if (String(req.toUserId) !== actorUserId) {
      throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
    }

    req.status = "declined";
    await req.save();

    const decliner = await UserModel.findById(actorUserId).select({ username: 1 }).lean();
    const { InboxService } = await import("../inbox/InboxService.js");
    await InboxService.createFriendDeclined({
      recipientId: String(req.fromUserId),
      fromUserId: actorUserId,
      fromUsername: decliner?.username ?? "Игрок",
    });
  }

  static async removeFriend(userId: string, friendId: string) {
    const [userA, userB] = canonicalPair(userId, friendId);
    await FriendshipModel.deleteOne({
      userA: new mongoose.Types.ObjectId(userA),
      userB: new mongoose.Types.ObjectId(userB),
    });
  }
}
