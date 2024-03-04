export default interface snipeInterface {
  messageId: string;
  authorId: string;
  guildId: string;
  channelId: string;
  methodType: "Delete"|"Edit";
  content: string;
  hasMedia: boolean;
  timestamp?: Date;
}
