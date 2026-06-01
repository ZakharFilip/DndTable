import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SessionParticipantSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "session_participants" }
);

SessionParticipantSchema.index({ gameSessionId: 1, userId: 1 }, { unique: true });

export type SessionParticipantDocument = InferSchemaType<typeof SessionParticipantSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SessionParticipantModel =
  mongoose.models.SessionParticipant ??
  mongoose.model("SessionParticipant", SessionParticipantSchema);
