import { Schema, model, Document, Types } from "mongoose";

export interface ISessionViewport {
  panX: number;
  panY: number;
  scale: number;
}

export interface ISessionState extends Document {
  gameSessionId: Types.ObjectId;
  viewport?: ISessionViewport;
  meta?: Record<string, unknown>;
  updatedAt: Date;
}

const SessionStateSchema = new Schema<ISessionState>(
  {
    gameSessionId: {
      type: Schema.Types.ObjectId,
      ref: "GameSession",
      required: true,
      unique: true,
    },
    viewport: {
      panX: { type: Number, default: 0 },
      panY: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
    },
    meta: { type: Schema.Types.Mixed },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

SessionStateSchema.index({ gameSessionId: 1 }, { unique: true });

export const SessionStateModel = model<ISessionState>(
  "SessionState",
  SessionStateSchema,
  "session_state"
);
