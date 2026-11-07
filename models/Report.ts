import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportSchema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["price", "info", "image", "other"], required: true },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "approved", "rejected"], default: "open", index: true },
  },
  { timestamps: true }
);

export type ReportDoc = InferSchemaType<typeof ReportSchema>;
export const Report: Model<ReportDoc> = models.Report || model<ReportDoc>("Report", ReportSchema);
