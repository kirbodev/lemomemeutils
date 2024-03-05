import mongoose from "mongoose";
import analyticsInterface from "../../structures/analyticsInterface";
import { Model } from "mongoose";

const analyticsSchema = new mongoose.Schema<analyticsInterface>({
  userID: {
    type: String,
    required: true,
  },
  guildID: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  responseTime: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["command", "message", "contextMenu", "button", "modal", "other"],
  },
  timestamp: {
    type: Date,
    default: () => new Date(),
  },
});

export default (mongoose.models.analytics as Model<analyticsInterface>) ||
  mongoose.model<analyticsInterface>("analytics", analyticsSchema, "analytics");
