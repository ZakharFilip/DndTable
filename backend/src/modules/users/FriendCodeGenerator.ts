import { UserModel } from "./user.model.js";

export class FriendCodeGenerator {
  static generateCandidate(): string {
    const n = Math.floor(Math.random() * 1_000_000);
    return n.toString().padStart(6, "0");
  }

  static async generateUnique(maxAttempts = 20): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const code = FriendCodeGenerator.generateCandidate();
      const exists = await UserModel.exists({ friendCode: code });
      if (!exists) return code;
    }
    throw new Error("Failed to generate unique friend code");
  }

  /** Assign friendCode to users missing one (startup backfill). */
  static async backfillMissing() {
    const users = await UserModel.find({
      $or: [{ friendCode: { $exists: false } }, { friendCode: null }, { friendCode: "" }],
    })
      .select({ _id: 1 })
      .lean();
    for (const u of users) {
      const code = await FriendCodeGenerator.generateUnique();
      await UserModel.updateOne({ _id: u._id }, { $set: { friendCode: code } });
    }
    if (users.length > 0) {
      console.log(`✅ Backfilled friendCode for ${users.length} user(s)`);
    }
  }
}
