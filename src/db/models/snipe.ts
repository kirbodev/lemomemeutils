import mongoose, { Model } from "mongoose";
import snipeInterface from "../../structures/snipeInterface";

const snipeSchema = new mongoose.Schema<snipeInterface>({
  messageId: { type: String, required: true },
  authorId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  methodType: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

export default (mongoose.models.snipe as Model<snipeInterface>) ||
  mongoose.model<snipeInterface>("snipe", snipeSchema, "snipe");
