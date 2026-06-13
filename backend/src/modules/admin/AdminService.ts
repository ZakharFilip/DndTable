import mongoose from "mongoose";
import { type AdminSessionDto, type AdminUserDto } from "@dnd-table/shared";
import { HttpError } from "../../shared/HttpError.js";
import { isAdminEmail } from "../../shared/adminEmail.js";
import { UserModel } from "../users/user.model.js";
import { GameSessionModel } from "../gamesessions/game-session.model.js";
import { cascadeDeleteSession } from "../gamesessions/sessionCascadeDelete.js";
import { UserDeletionService } from "../users/UserDeletionService.js";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class AdminService {
  static async listSessions(q?: string): Promise<AdminSessionDto[]> {
    const filter: Record<string, unknown> = {};
    if (q?.trim()) {
      const escaped = escapeRegex(q.trim());
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    const sessions = await GameSessionModel.find(filter)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .lean();

    return sessions.map((s) => ({
      id: String(s._id),
      name: s.name,
      description: s.description,
      isPrivate: s.isPrivate,
      isBlocked: Boolean(s.isBlocked),
      createdBy:
        typeof s.createdBy === "object" && s.createdBy && "_id" in s.createdBy
          ? String((s.createdBy as { _id: mongoose.Types.ObjectId })._id)
          : String(s.createdBy),
      createdByUsername:
        typeof s.createdBy === "object" && s.createdBy && "username" in s.createdBy
          ? (s.createdBy as { username: string }).username
          : "—",
      createdAt: (s.createdAt as Date).toISOString(),
    }));
  }

  static async setSessionBlocked(sessionId: string, isBlocked: boolean) {
    const session = await GameSessionModel.findByIdAndUpdate(
      sessionId,
      { $set: { isBlocked } },
      { new: true }
    ).lean();
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", "Сессия не найдена");
    }
    return { id: String(session._id), isBlocked: Boolean(session.isBlocked) };
  }

  static async deleteSession(sessionId: string) {
    const exists = await GameSessionModel.findById(sessionId).select({ _id: 1 }).lean();
    if (!exists) {
      throw new HttpError(404, "NOT_FOUND", "Сессия не найдена");
    }
    await cascadeDeleteSession(sessionId);
    return { success: true };
  }

  static async listUsers(q?: string): Promise<AdminUserDto[]> {
    const filter: Record<string, unknown> = {};
    if (q?.trim()) {
      const escaped = escapeRegex(q.trim());
      filter.$or = [
        { email: { $regex: escaped, $options: "i" } },
        { username: { $regex: escaped, $options: "i" } },
      ];
    }

    const users = await UserModel.find(filter)
      .select("email username isBanned createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const counts = await GameSessionModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]);
    const countByUser = new Map(counts.map((c) => [String(c._id), c.count]));

    return users.map((u) => ({
      id: String(u._id),
      email: u.email,
      username: u.username,
      isBanned: Boolean(u.isBanned),
      isAdmin: isAdminEmail(u.email),
      sessionCount: countByUser.get(String(u._id)) ?? 0,
      createdAt: (u.createdAt as Date).toISOString(),
    }));
  }

  static async setUserBanned(userId: string, isBanned: boolean) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");
    }
    if (isAdminEmail(user.email)) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя заблокировать администратора");
    }
    user.isBanned = isBanned;
    await user.save();
    return { id: String(user._id), isBanned: user.isBanned };
  }

  static async deleteUser(userId: string) {
    const user = await UserModel.findById(userId).select("email").lean();
    if (!user) {
      throw new HttpError(404, "NOT_FOUND", "Пользователь не найден");
    }
    if (isAdminEmail(user.email)) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя удалить учётную запись администратора");
    }
    await UserDeletionService.deleteUser(userId);
    return { success: true };
  }
}
