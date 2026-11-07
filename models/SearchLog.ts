import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SearchLogSchema = new Schema({
  query: { type: String, required: true, unique: true, lowercase: true, trim: true },
  count: { type: Number, default: 1 },
  lastSeenAt: { type: Date, default: Date.now },
});

SearchLogSchema.index({ count: -1 });

export type SearchLogDoc = InferSchemaType<typeof SearchLogSchema>;
export const SearchLog: Model<SearchLogDoc> =
  models.SearchLog || model<SearchLogDoc>("SearchLog", SearchLogSchema);
