import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const DetectedSchema = new Schema(
  {
    rawName: String,
    strength: String,
    dose: String,
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine" },
    confidence: Number,
    needsReview: { type: Boolean, default: false },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageUrl: { type: String, required: true },
    detected: { type: [DetectedSchema], default: [] },
    totalSaving: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type PrescriptionDoc = InferSchemaType<typeof PrescriptionSchema>;
export const Prescription: Model<PrescriptionDoc> =
  models.Prescription || model<PrescriptionDoc>("Prescription", PrescriptionSchema);
