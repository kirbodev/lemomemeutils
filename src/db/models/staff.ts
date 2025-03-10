// Create a dev model to be used to store OTP secrets, id must be in "devs" from config.ts
import mongoose, { Model } from "mongoose";
import staffInterface from "../../structures/staffInterface.js";

const staffSchema = new mongoose.Schema<staffInterface>({
  userID: {
    type: String,
    required: true,
  },
  guildID: {
    type: String,
    required: true,
  },
  appliedAt: {
    type: Date,
    required: false,
    default: () => new Date(),
  },
  voteMessage: {
    type: String,
    required: true,
  },
  decision: {
    type: {
      approved: Boolean,
      decisionAt: Date,
      reason: String,
      votes: {
        type: Map,
        of: Boolean,
      },
    },
    default: {
      votes: new Map(),
    },
  },
  staffLevel: {
    type: Number,
    default: 0,
    enum: [0, 1, 2, 3, 4, 5, 6, 7],
  },
  type: {
    type: String,
    default: "staff",
    enum: ["staff", "event"],
  },
});

export default (mongoose.models.staff as Model<staffInterface>) ||
  mongoose.model<staffInterface>("staff", staffSchema, "staff");
