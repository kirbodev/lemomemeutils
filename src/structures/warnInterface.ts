export default interface warnInterface {
    userID: string,
    moderatorID: string,
    expiresAt: Date,
    forceExpired: boolean,
    withMute: boolean | Date,
    severity: number,
    timestamp: Date,
    reason: string,
    type: string
}