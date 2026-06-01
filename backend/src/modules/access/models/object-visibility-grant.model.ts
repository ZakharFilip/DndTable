import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ObjectVisibilityGrantSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, index: true },
    objectKey: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    value: { type: String, enum: ["Visible", "Hidden"], required: true },
  },
  { timestamps: true, collection: "object_visibility_grants" }
);

ObjectVisibilityGrantSchema.index(
  { gameSessionId: 1, objectKey: 1, teamId: 1 },
  { unique: true }
);

export type ObjectVisibilityGrantDocument = InferSchemaType<
  typeof ObjectVisibilityGrantSchema
> & { _id: mongoose.Types.ObjectId };

export const ObjectVisibilityGrantModel =
  mongoose.models.ObjectVisibilityGrant ??
  mongoose.model("ObjectVisibilityGrant", ObjectVisibilityGrantSchema);
