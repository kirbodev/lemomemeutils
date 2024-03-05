import mongoose from "mongoose";
import snipeInterface from "../../structures/snipeInterface";

const snipeSchema = new mongoose.Schema<snipeInterface>({
  messageId: {
    type: String,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  methodType: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  hasMedia: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.models.snipe || mongoose.model<snipeInterface>("snipe", snipeSchema, "snipes");
