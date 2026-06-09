import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FriendRequestSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true, collection: "friend_requests" }
);

FriendRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export type FriendRequestDocument = InferSchemaType<typeof FriendRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FriendRequestModel =
  mongoose.models.FriendRequest ?? mongoose.model("FriendRequest", FriendRequestSchema);
