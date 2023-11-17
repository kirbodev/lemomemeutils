import { randomUUID } from "crypto";

export default interface warnInterface {
    id: typeof randomUUID,
    userID: string,
    moderatorID: string,
    expiresAt: Date,
    forceExpired: boolean,
    withMute: boolean,
    severity: number,
    timestamp: Date,
    reason: string,
}