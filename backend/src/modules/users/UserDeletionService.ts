import mongoose from "mongoose";
import { HttpError } from "../../shared/HttpError.js";
import { isAdminEmail } from "../../shared/adminEmail.js";
import { UserModel } from "./user.model.js";
import { GameSessionModel } from "../gamesessions/game-session.model.js";
import { FriendshipModel } from "../friends/models/friendship.model.js";
import { FriendRequestModel } from "../friends/models/friend-request.model.js";
import { InboxMessageModel } from "../inbox/models/inbox-message.model.js";
import { SessionParticipantModel } from "../access/models/session-participant.model.js";
import { TeamUserMemberModel } from "../access/models/team-user-member.model.js";
import { cascadeDeleteSession } from "../gamesessions/sessionCascadeDelete.js";
import { deleteAvatarFile } from "./avatarUpload.js";

export class UserDeletionService {
  static async countAdminUsers(): Promise<number> {
    return UserModel.countDocuments({
      email: { $regex: /@admin\.admin\.admin$/i },
    });
  }

  static async deleteUser(userId: string, options?: { allowAdmin?: boolean }): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");
    }

    const adminUser = isAdminEmail(user.email);
    if (adminUser && !options?.allowAdmin) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя удалить учётную запись администратора");
    }
    if (adminUser) {
      const adminCount = await UserDeletionService.countAdminUsers();
      if (adminCount <= 1) {
        throw new HttpError(403, "FORBIDDEN", "Нельзя удалить последнего администратора");
      }
    }

    const userOid = new mongoose.Types.ObjectId(userId);

    const ownedSessions = await GameSessionModel.find({ createdBy: userOid }).select({ _id: 1 }).lean();
    for (const s of ownedSessions) {
      await cascadeDeleteSession(String(s._id));
    }

    await FriendshipModel.deleteMany({
      $or: [{ userA: userOid }, { userB: userOid }],
    });
    await FriendRequestModel.deleteMany({
      $or: [{ fromUserId: userOid }, { toUserId: userOid }],
    });
    await InboxMessageModel.deleteMany({ recipientId: userOid });
    await SessionParticipantModel.deleteMany({ userId: userOid });
    await TeamUserMemberModel.deleteMany({ userId: userOid });

    const oldAvatar = user.avatar;
    await UserModel.deleteOne({ _id: userOid });
    deleteAvatarFile(oldAvatar);
  }
}
