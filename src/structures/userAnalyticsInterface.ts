export interface UserMessage {
  timestamp: Date;
  channelID: string;
}

export default interface userAnalyticsInterface {
  userID: string;
  guildID: string;
  messages: {
    amount: number;
    hour: Date;
  }[];
  channels: {
    channelID: string;
    messages: {
      hour: Date;
      amount: number;
    }[];
  }[];
}
