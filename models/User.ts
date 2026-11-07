import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    savedMedicines: [{ type: Schema.Types.ObjectId, ref: "Medicine" }],
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User: Model<UserDoc> = models.User || model<UserDoc>("User", UserSchema);
