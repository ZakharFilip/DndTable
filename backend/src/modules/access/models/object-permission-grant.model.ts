import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ObjectPermissionGrantSchema = new Schema(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true, index: true },
    objectKey: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    permission: { type: String, required: true },
    value: { type: String, enum: ["Allow", "Deny"], required: true },
  },
  { timestamps: true, collection: "object_permission_grants" }
);

ObjectPermissionGrantSchema.index(
  { gameSessionId: 1, objectKey: 1, teamId: 1, permission: 1 },
  { unique: true }
);

export type ObjectPermissionGrantDocument = InferSchemaType<
  typeof ObjectPermissionGrantSchema
> & { _id: mongoose.Types.ObjectId };

export const ObjectPermissionGrantModel =
  mongoose.models.ObjectPermissionGrant ??
  mongoose.model("ObjectPermissionGrant", ObjectPermissionGrantSchema);
