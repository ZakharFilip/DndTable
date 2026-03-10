import { Schema, model, Document, Types } from "mongoose";

export interface ITableObject extends Document {
  gameSessionId: Types.ObjectId;
  type: string;
  x: number;
  y: number;
  sortOrder?: number;
  props: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TableObjectSchema = new Schema<ITableObject>(
  {
    gameSessionId: { type: Schema.Types.ObjectId, ref: "GameSession", required: true },
    type: { type: String, required: true, trim: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    props: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

TableObjectSchema.index({ gameSessionId: 1 });
TableObjectSchema.index({ gameSessionId: 1, type: 1 });

export const TableObjectModel = model<ITableObject>(
  "TableObject",
  TableObjectSchema,
  "table_objects"
);
