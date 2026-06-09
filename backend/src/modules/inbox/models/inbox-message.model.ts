import mongoose, { Schema, type InferSchemaType } from "mongoose";

const InboxMessageSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "read", "acted"],
      default: "pending",
    },
    actionable: { type: Boolean, default: false },
    text: { type: String, required: true },
  },
  { timestamps: true, collection: "inbox_messages" }
);

InboxMessageSchema.index({ recipientId: 1, createdAt: -1 });

export type InboxMessageDocument = InferSchemaType<typeof InboxMessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const InboxMessageModel =
  mongoose.models.InboxMessage ?? mongoose.model("InboxMessage", InboxMessageSchema);
