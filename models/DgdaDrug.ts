import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Snapshot of the DGDA registered-drug list (from the DGHS OCL server). Filled only by `npm run db:sync-dgda`. */
const DgdaDrugSchema = new Schema({
  conceptId: { type: String, required: true, unique: true }, // OCL concept id, e.g. "341-0160-020--tericin"
  darNumber: { type: String, default: null }, // "341-0160-020"
  darKey: { type: String, default: null }, // digits only, for lookup
  darFlag: { type: String, default: null }, // OCL quality flag: shared_dar | dar_malformed | …
  tradeName: { type: String, required: true },
  brandKey: { type: String, required: true }, // lib/dgda.ts brandKey()
  company: { type: String, default: null },
  companyKey: { type: String, default: null },
  dosageForm: { type: String, default: null },
  genericContent: { type: String, default: null }, // "Omeprazole  40 mg"
  strengthNum: { type: String, default: null }, // first number of genericContent
  sourceUpdatedAt: { type: Date, default: null },
  syncedAt: { type: Date, required: true },
});

DgdaDrugSchema.index({ brandKey: 1 });
DgdaDrugSchema.index({ darKey: 1 });
DgdaDrugSchema.index({ syncedAt: -1 });

export type DgdaDrugDoc = InferSchemaType<typeof DgdaDrugSchema>;
export const DgdaDrug: Model<DgdaDrugDoc> = models.DgdaDrug || model<DgdaDrugDoc>("DgdaDrug", DgdaDrugSchema);
