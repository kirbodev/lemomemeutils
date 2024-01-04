export default interface actionInterface {
    userID: string;
    moderatorID: string;
    guildID: string;
    expiresAt?: Date;
    forceExpired?: boolean;
    withParole?: boolean | Date;
    actionType: "kick" | "ban" | "unban" | "mute" | "unmute";
    iceSeverity?: number;
    reason?: string;
    timestamp?: Date;
}