// Create a dev model to be used to store OTP secrets, id must be in "devs" from config.ts
import mongoose, { Model } from "mongoose";
import devInterface from "../../structures/devInterface";

const devSchema = new mongoose.Schema<devInterface>({
  id: {
    type: String,
    required: true,
  },
  secret: {
    type: String,
    required: true,
  },
  lastVerified: {
    type: Date,
    required: false,
    default: () => new Date(),
  },
  timestamp: {
    type: Date,
    default: () => new Date(),
  },
});

export default (mongoose.models.dev as Model<devInterface>) ||
  mongoose.model<devInterface>("dev", devSchema, "devs");
