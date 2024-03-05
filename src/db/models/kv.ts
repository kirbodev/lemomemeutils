import mongoose, { Model } from "mongoose";
import kvInterface from "../../structures/kvInterface";

const kvSchema = new mongoose.Schema<kvInterface>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: String,
    required: true,
  },
});

export default (mongoose.models.kv as Model<kvInterface>) ||
  mongoose.model<kvInterface>("kv", kvSchema, "kv");
