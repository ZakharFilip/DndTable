import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SessionInviteSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true, collection: "session_invites" }
);

SessionInviteSchema.index({ gameSessionId: 1, toUserId: 1, status: 1 });

export type SessionInviteDocument = InferSchemaType<typeof SessionInviteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SessionInviteModel =
  mongoose.models.SessionInvite ?? mongoose.model("SessionInvite", SessionInviteSchema);
