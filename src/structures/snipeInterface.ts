export default interface snipeInterface {
  messageId: string;
  authorId: string;
  guildId: string;
  channelId: string;
  methodType: "delete" | "edit";
  content: string;
  hidden?: boolean;
  timestamp?: Date;
}
