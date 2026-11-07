import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InteractionSchema = new Schema(
  {
    genericA: { type: Schema.Types.ObjectId, ref: "Generic", required: true },
    genericB: { type: Schema.Types.ObjectId, ref: "Generic", required: true },
    severity: { type: String, enum: ["low", "moderate", "high"], required: true },
    description: { type: String, required: true },
    source: { type: String, required: true }, // every record must cite a reliable source
  },
  { timestamps: true }
);

InteractionSchema.index({ genericA: 1, genericB: 1 }, { unique: true });

// Store the pair sorted so A-B and B-A resolve to the same record
InteractionSchema.pre("validate", function () {
  if (String(this.genericA) > String(this.genericB)) {
    const a = this.genericA;
    this.genericA = this.genericB;
    this.genericB = a;
  }
});

export type InteractionDoc = InferSchemaType<typeof InteractionSchema>;
export const Interaction: Model<InteractionDoc> =
  models.Interaction || model<InteractionDoc>("Interaction", InteractionSchema);
