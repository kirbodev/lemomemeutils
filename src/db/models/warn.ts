import { randomUUID } from "crypto";
import mongoose from "mongoose";
import warnInterface from "../../structures/warnInterface";

const warnSchema = new mongoose.Schema<warnInterface>({
    id: {
        type: "UUID",
        default: () => randomUUID(),
    },
    userID: {
        type: String,
        required: true,
    },
    moderatorID: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    forceExpired: {
        type: Boolean,
        default: false,
    },
    withMute: {
        type: Boolean,
        default: false,
    },
    severity: {
        type: Number,
        required: true,
        enum: [0, 1, 2, 3],
    },
    timestamp: {
        type: Date,
        default: () => new Date(),
    },
    reason: {
        type: String,
        default: () => "No reason provided",
    },
});

export default mongoose.model<warnInterface>("warn", warnSchema, "warns");