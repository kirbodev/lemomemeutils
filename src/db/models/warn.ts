import mongoose from "mongoose";
import warnInterface from "../../structures/warnInterface";

const unwarnInterface = new mongoose.Schema({
    moderatorID: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        default: () => "No reason provided",
    },
    timestamp: {
        type: Date,
        default: () => new Date(),
    },
});

export { unwarnInterface };

const warnSchema = new mongoose.Schema<warnInterface>({
    userID: {
        type: String,
        required: true,
    },
    guildID: {
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
    unwarn: {
        type: unwarnInterface,
    },
    withMute: {
        type: Date
    },
    severity: {
        type: Number,
        required: true,
        enum: [1, 2], // 1 = light, 2 = heavy
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

export default mongoose.models.warn || mongoose.model("warn", warnSchema, "warns");