//TODO - Implement later, dont commit

export default interface analyticsEvent {
  name: string;
  userID: string;
  guildID?: string;
  type: "command" | "message" | "contextMenu" | "button" | "modal" | "other";
  responseTime: number; // in ms
  timestamp?: Date;
}
