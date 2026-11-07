import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Ingredient-level drug interaction (lib/ingredients.ts keys), originally mined from label text
// (data now lives in MongoDB). Evidence is the verbatim label sentence(s) — we never invent severity.
// A missing pair means "no information", never "safe".
export const INTERACTION_SEVERITIES = ["warning", "caution"] as const; // warning = label says avoid/contraindicated

const EvidenceSchema = new Schema(
  {
    genericName: { type: String, required: true }, // whose label the sentence comes from
    genericSlug: { type: String, required: true },
    text: { type: String, required: true },
    via: String, // set when the label names a drug class ("anticoagulants"), not the drug itself
  },
  { _id: false }
);

const InteractionSchema = new Schema(
  {
    pairKey: { type: String, required: true, unique: true }, // "aspirin|warfarin" (sorted)
    a: { type: String, required: true }, // ingredient key, a < b
    b: { type: String, required: true },
    aName: { type: String, required: true },
    bName: { type: String, required: true },
    severity: { type: String, enum: INTERACTION_SEVERITIES, required: true },
    evidence: { type: [EvidenceSchema], default: [] },
    source: { type: String, required: true }, // every record must cite its source
  },
  { timestamps: true }
);

export type InteractionDoc = InferSchemaType<typeof InteractionSchema>;
export const Interaction: Model<InteractionDoc> =
  models.Interaction || model<InteractionDoc>("Interaction", InteractionSchema);
