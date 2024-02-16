export default interface warnInterface {
  userID: string;
  guildID: string;
  moderatorID: string;
  expiresAt: Date;
  unwarn: {
    moderatorID: string;
    reason?: string;
    timestamp?: Date;
  };
  withMute?: Date;
  severity: number; // 1 = light, 2 = heavy
  timestamp: Date;
  reason: string;
}

export interface unwarnInterface {
  moderatorID: string;
  reason?: string;
  timestamp?: Date;
}
