import mongoose, { Schema, type InferSchemaType } from "mongoose";

const GlobalPermissionGrantSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    permission: { type: String, required: true },
    value: { type: String, enum: ["Allow", "Deny"], required: true },
    context: { type: String, default: "Default" },
  },
  { timestamps: true, collection: "global_permission_grants" }
);

GlobalPermissionGrantSchema.index(
  { gameSessionId: 1, teamId: 1, permission: 1, context: 1 },
  { unique: true }
);

export type GlobalPermissionGrantDocument = InferSchemaType<
  typeof GlobalPermissionGrantSchema
> & { _id: mongoose.Types.ObjectId };

export const GlobalPermissionGrantModel =
  mongoose.models.GlobalPermissionGrant ??
  mongoose.model("GlobalPermissionGrant", GlobalPermissionGrantSchema);
