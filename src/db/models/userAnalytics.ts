import mongoose from "mongoose";
import userAnalyticsInterface from "../../structures/userAnalyticsInterface";
import { Model } from "mongoose";

const userAnalyticsSchema = new mongoose.Schema<userAnalyticsInterface>({
  userID: {
    type: String,
    required: true,
  },
  guildID: {
    type: String,
    required: true,
  },
  messages: {
    type: [
      {
        amount: Number,
        hour: Date,
      },
    ],
    required: true,
  },
  channels: {
    type: [
      {
        channelID: String,
        messages: [
          {
            hour: Date,
            amount: Number,
          },
        ],
      },
    ],
    required: true,
  },
});

export default (mongoose.models
  .userAnalytics as Model<userAnalyticsInterface>) ||
  mongoose.model<userAnalyticsInterface>(
    "userAnalytics",
    userAnalyticsSchema,
    "userAnalytics"
  );
