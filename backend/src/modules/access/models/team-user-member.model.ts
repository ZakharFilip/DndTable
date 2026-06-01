import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TeamUserMemberSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true, collection: "team_user_members" }
);

TeamUserMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export type TeamUserMemberDocument = InferSchemaType<typeof TeamUserMemberSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TeamUserMemberModel =
  mongoose.models.TeamUserMember ?? mongoose.model("TeamUserMember", TeamUserMemberSchema);
