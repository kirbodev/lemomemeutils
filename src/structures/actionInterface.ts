export default interface actionInterface {
    userID: string;
    moderatorID: string;
    expiresAt?: Date;
    forceExpired?: boolean;
    withParole?: boolean | Date;
    actionType: string;
    reason?: string;
    timestamp?: Date;
}