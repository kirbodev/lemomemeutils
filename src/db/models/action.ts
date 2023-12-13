// To clarify: An "action" is an action that a moderator takes upon a user that is not a warn or mute but rather usually a discord native action such as a kick or ban, with additional parameters for commands like parole etc.
import mongoose from "mongoose";
import actionInterface from "../../structures/actionInterface";

const actionSchema = new mongoose.Schema<actionInterface>({
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
        required: false,
    },
    forceExpired: {
        type: Boolean,
        default: false,
    },
    timestamp: {
        type: Date,
        default: () => new Date(),
    },
    reason: {
        type: String,
        default: () => "No reason provided",
    },
    actionType: {
        type: String,
        required: true,
        enum: ["kick", "ban", "unban"],
    },
    withParole: {
        type: mongoose.Schema.Types.Mixed,
        default: false,
    }
});

export default mongoose.model<actionInterface>("action", actionSchema, "actions");