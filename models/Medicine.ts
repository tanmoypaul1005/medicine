import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const MEDICINE_TYPES = ["allopathic", "herbal"] as const;

// One purchasable pack, parsed from CSV "package container".
// "Unit Price: ৳ 5.98,(100's pack: ৳ 598.00)" → { label: "unit", price: 5.98, qty: 100, qtyPrice: 598 }
// "100 ml bottle: ৳ 40.12"                    → { label: "100 ml bottle", price: 40.12 }
const PackSchema = new Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: Number,
    qtyPrice: Number,
  },
  { _id: false }
);

const MedicineSchema = new Schema(
  {
    sourceId: { type: String, unique: true, sparse: true },
    brand: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] }, // "নাপা", "nappa"
    type: { type: String, enum: MEDICINE_TYPES, default: "allopathic" },
    genericId: { type: Schema.Types.ObjectId, ref: "Generic", index: true },
    genericName: { type: String, trim: true }, // denormalized for Atlas Search
    strength: { type: String, trim: true }, // "500 mg", "4 mg/5 ml"; null if unknown
    dosageForm: { type: String, required: true, trim: true }, // exact source form: "Tablet (Enteric Coated)"
    formSlug: { type: String, required: true }, // "tablet-enteric-coated"
    manufacturerId: { type: Schema.Types.ObjectId, ref: "Manufacturer", index: true },
    manufacturerName: { type: String, trim: true }, // denormalized for Atlas Search
    unitPrice: { type: Number, min: 0 }, // per unit, else cheapest pack; null = unavailable
    priceLabel: { type: String, default: null }, // what unitPrice is for: null = per unit, else pack label ("5 gm tube")
    packs: { type: [PackSchema], default: [] },
    priceText: String, // raw source string, for audits
    priceVerifiedAt: Date,
    popularity: { type: Number, default: 0 },
    // Product photo (docs/medicine-images-plan.md). Shown only when approved.
    image: {
      url: String, // Cloudinary secure_url
      publicId: String, // "oshudkhuji/medicines/<slug>" — to replace/delete
      width: Number,
      height: Number,
      source: String, // who gave the image, e.g. "arogga.com (permission)"
      sourceUrl: String, // product page it came from (audit)
      approved: { type: Boolean, default: false },
      importedAt: Date,
    },
  },
  { timestamps: true }
);

// Alternatives query: same generic + strength + form, sorted by price
MedicineSchema.index({ genericId: 1, strength: 1, formSlug: 1, unitPrice: 1 });

// Atlas Search index (created by `npm run db:search-index`, not by Mongoose)
export const MEDICINE_SEARCH_INDEX = "medicine_search";
const autocomplete = { type: "autocomplete", tokenization: "edgeGram", minGrams: 2, maxGrams: 15, foldDiacritics: true };
/** Fields a search hit needs. Stored in the index so `$search` + `returnStoredSource` skips the per-hit document lookup. */
export const MEDICINE_SEARCH_STORED = [
  "slug",
  "brand",
  "type",
  "strength",
  "dosageForm",
  "genericName",
  "manufacturerName",
  "unitPrice",
  "priceLabel",
] as const;
export const MEDICINE_SEARCH_DEFINITION = {
  storedSource: { include: [...MEDICINE_SEARCH_STORED] },
  mappings: {
    dynamic: false,
    fields: {
      brand: [{ type: "string" }, autocomplete, { type: "token", normalizer: "lowercase" }], // token → sortable
      genericName: [{ type: "string" }, autocomplete],
      aliases: [{ type: "string" }, autocomplete],
      manufacturerName: { type: "string" },
      strength: { type: "string" }, // "500 mg" → tokens 500, mg
      type: { type: "token" },
    },
  },
};

export type MedicineDoc = InferSchemaType<typeof MedicineSchema>;
export const Medicine: Model<MedicineDoc> =
  models.Medicine || model<MedicineDoc>("Medicine", MedicineSchema);
