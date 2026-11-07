import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const GenericSchema = new Schema(
  {
    sourceId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    drugClass: { type: String, trim: true },
    indications: { type: [String], default: [] },
    sideEffects: { type: [String], default: [] },
    contraindications: { type: [String], default: [] },
    pregnancyCategory: { type: String, enum: ["A", "B", "C", "D", "X", "N"] },
  },
  { timestamps: true }
);

export type GenericDoc = InferSchemaType<typeof GenericSchema>;
export const Generic: Model<GenericDoc> =
  models.Generic || model<GenericDoc>("Generic", GenericSchema);
