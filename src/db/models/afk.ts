import mongoose from "mongoose";
import afkInterface from "../../structures/afkInterface";

const afkSchema = new mongoose.Schema<afkInterface>({
  userID: {
    type: String,
    required: true,
  },
  guildID: {
    type: String,
    required: true,
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

export default mongoose.models.afk ||
  mongoose.model<afkInterface>("afk", afkSchema, "afk");
