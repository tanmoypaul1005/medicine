import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ManufacturerSchema = new Schema(
  {
    sourceId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    brandCount: { type: Number, default: 0 }, // filled by importer
  },
  { timestamps: true }
);

export type ManufacturerDoc = InferSchemaType<typeof ManufacturerSchema>;
export const Manufacturer: Model<ManufacturerDoc> =
  models.Manufacturer || model<ManufacturerDoc>("Manufacturer", ManufacturerSchema);
