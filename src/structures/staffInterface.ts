export enum StaffLevel {
  None,
  Retired,
  Farmer,
  Apple,
  Pineapple,
  Orange,
  Grapefruit,
  Lime,
  Event,
}

export default interface staffInterface {
  userID: string;
  guildID: string;
  appliedAt: Date;
  voteMessage: string;
  decision: {
    approved?: boolean;
    decisionAt?: Date;
    reason?: string;
    votes: Map<string, boolean>;
  };
  staffLevel: StaffLevel;
  type: "staff" | "event";
}
