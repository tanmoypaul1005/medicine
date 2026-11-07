import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const DOSAGE_FORMS = ["tablet", "capsule", "syrup", "injection", "cream", "drop", "other"] as const;

const MedicineSchema = new Schema(
  {
    sourceId: { type: String, unique: true, sparse: true },
    brand: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] }, // "নাপা", "nappa"
    genericId: { type: Schema.Types.ObjectId, ref: "Generic", index: true },
    genericName: { type: String, trim: true }, // denormalized for Atlas Search
    strength: { type: String, trim: true }, // "500 mg"
    form: { type: String, enum: DOSAGE_FORMS, default: "other" },
    manufacturerId: { type: Schema.Types.ObjectId, ref: "Manufacturer" },
    manufacturerName: { type: String, trim: true }, // denormalized for Atlas Search
    unitPrice: { type: Number, min: 0 },
    packInfo: String,
    priceVerifiedAt: Date,
    popularity: { type: Number, default: 0 },
    image: { url: String, source: String, approved: { type: Boolean, default: false } },
  },
  { timestamps: true }
);

// Alternatives query: same generic + strength + form, sorted by price
MedicineSchema.index({ genericId: 1, strength: 1, form: 1, unitPrice: 1 });

export type MedicineDoc = InferSchemaType<typeof MedicineSchema>;
export const Medicine: Model<MedicineDoc> =
  models.Medicine || model<MedicineDoc>("Medicine", MedicineSchema);
