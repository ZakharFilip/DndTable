import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FriendshipSchema = new Schema(
  {
    userA: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userB: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true, collection: "friendships" }
);

FriendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

export type FriendshipDocument = InferSchemaType<typeof FriendshipSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FriendshipModel =
  mongoose.models.Friendship ?? mongoose.model("Friendship", FriendshipSchema);

export function canonicalPair(userId1: string, userId2: string): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}
