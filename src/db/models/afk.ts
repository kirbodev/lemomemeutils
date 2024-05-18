import mongoose, { Model } from "mongoose";
import afkInterface from "../../structures/afkInterface.js";

const afkSchema = new mongoose.Schema<afkInterface>({
  userID: {
    type: String,
    required: true,
  },
  guildID: {
    type: String,
    required: false,
  },
  message: {
    type: String,
    required: false,
  },
  timestamp: {
    type: Date,
    default: () => new Date(),
  },
  expiresAt: {
    type: Date,
    required: false,
  },
});

export default (mongoose.models.afk as Model<afkInterface>) ||
  mongoose.model<afkInterface>("afk", afkSchema, "afk");
