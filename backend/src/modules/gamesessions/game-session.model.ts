import { Schema, model, Document, Types } from "mongoose";

export interface IGameSession extends Document {
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    isPrivate: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const GameSessionModel = model<IGameSession>("GameSession", GameSessionSchema);
