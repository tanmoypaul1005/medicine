import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Monograph sections from source (sanitized HTML). Keys map 1:1 to CSV "<x> description" columns.
export const GENERIC_SECTIONS = [
  "indication",
  "therapeuticClass",
  "pharmacology",
  "dosage",
  "administration",
  "interaction",
  "contraindications",
  "sideEffects",
  "pregnancyLactation",
  "precautions",
  "pediatric",
  "overdose",
  "duration",
  "reconstitution",
  "storage",
] as const;
export type GenericSection = (typeof GENERIC_SECTIONS)[number];

const sectionsShape = Object.fromEntries(GENERIC_SECTIONS.map((k) => [k, String])) as Record<
  GenericSection,
  StringConstructor
>;

const GenericSchema = new Schema(
  {
    sourceId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] }, // Bangla / common names, e.g. "প্যারাসিটামল"
    drugClass: { type: String, trim: true, index: true },
    pregnancyCategory: { type: String, enum: ["A", "B", "C", "D", "X", "N"] },
    sections: sectionsShape,
    monographUrl: String,
    brandCount: { type: Number, default: 0 }, // filled by importer
  },
  { timestamps: true }
);

export type GenericDoc = InferSchemaType<typeof GenericSchema>;
export const Generic: Model<GenericDoc> =
  models.Generic || model<GenericDoc>("Generic", GenericSchema);
