import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "default-avatar.png" }
  },
  { timestamps: true }
);

export const UserModel = model<IUser>("User", UserSchema);
