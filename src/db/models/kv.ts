import mongoose from "mongoose";
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

export default mongoose.models.kv ||
  mongoose.model<kvInterface>("kv", kvSchema, "kv");
