import { UserModel } from "./user.model.js";

export class UserSearchService {
  static async search(query: string, requesterId: string, limit = 20) {
    const q = query.trim();
    if (q.length < 2) return [];

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await UserModel.find({
      _id: { $ne: requesterId },
      username: { $regex: escaped, $options: "i" },
    })
      .select({ username: 1, avatar: 1 })
      .limit(limit)
      .lean();

    return users.map((u) => ({
      id: String(u._id),
      username: u.username,
      avatar: u.avatar ?? "default-avatar.png",
    }));
  }
}
