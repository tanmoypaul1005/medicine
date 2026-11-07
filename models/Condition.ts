import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Common, mild condition → label-listed OTC generics (docs/conditions-feature.md).
// Seeded/mined by `npm run db:conditions` from scripts/import/lib/conditionCatalog.ts. Never hand-edit generics[].
const ConditionGenericSchema = new Schema(
  {
    genericId: { type: Schema.Types.ObjectId, ref: "Generic", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    evidence: { type: String, required: true }, // verbatim indication sentence from the label
  },
  { _id: false }
);

const ConditionSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    order: { type: Number, default: 0 },
    icon: { type: String, default: "pill" }, // lucide icon key, mapped in components/conditions
    nameBn: { type: String, required: true },
    nameEn: { type: String, required: true },
    aliases: { type: [String], default: [] }, // lowercase bn/en search terms
    summaryBn: { type: String, required: true },
    summaryEn: { type: String, required: true },
    redFlagsBn: { type: [String], default: [] },
    redFlagsEn: { type: [String], default: [] },
    formPattern: { type: String, required: true }, // regex source: dosage forms allowed for this condition
    generics: { type: [ConditionGenericSchema], default: [] },
    reviewed: { type: Boolean, default: false }, // true only after a doctor/pharmacist review
  },
  { timestamps: true }
);

ConditionSchema.index({ aliases: 1 });

export type ConditionDoc = InferSchemaType<typeof ConditionSchema>;
export const Condition: Model<ConditionDoc> = models.Condition || model<ConditionDoc>("Condition", ConditionSchema);
