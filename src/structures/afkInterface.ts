export default interface afkInterface {
  userID: string;
  guildID?: string;
  timestamp?: Date;
  message?: string;
  expiresAt?: Date;
}
