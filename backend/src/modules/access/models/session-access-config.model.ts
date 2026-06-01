import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SessionAccessConfigSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, unique: true },
    defaultTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    sessionOwnerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "session_access_config" }
);

export type SessionAccessConfigDocument = InferSchemaType<typeof SessionAccessConfigSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SessionAccessConfigModel =
  mongoose.models.SessionAccessConfig ??
  mongoose.model("SessionAccessConfig", SessionAccessConfigSchema);
