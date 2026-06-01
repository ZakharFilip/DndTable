import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TeamSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, default: null },
    isSystem: { type: Boolean, default: false },
    isDefaultForNewUsers: { type: Boolean, default: false },
    parentTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
  },
  { timestamps: true, collection: "teams" }
);

TeamSchema.index({ gameSessionId: 1, slug: 1 }, { unique: true, sparse: true });
TeamSchema.index({ gameSessionId: 1, name: 1 });

export type TeamDocument = InferSchemaType<typeof TeamSchema> & { _id: mongoose.Types.ObjectId };

export const TeamModel =
  mongoose.models.Team ?? mongoose.model("Team", TeamSchema);
