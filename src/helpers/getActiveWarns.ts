import { GuildMember } from "discord.js";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface";
import { Warn } from "../db";

export default async (member: GuildMember, trueValue = false) => {
  // True value returns heavy warns without altering them, false value returns all warns (for logging)
  const warns: HydratedDocument<warnInterface>[] = await Warn.find({
    userID: member.id,
    guildID: member.guild.id,
    expiresAt: { $gte: new Date().getTime() },
    unwarn: { $exists: false },
  });
  if (!warns) return null;
  if (trueValue) return warns;
  for (const warn of warns) {
    if (
      warn.severity === 2 &&
      warn.timestamp.getTime() + 1000 * 60 * 60 * 24 * 3 <= new Date().getTime()
    ) {
      warn.severity = 1;
      continue;
    }
  }
  return warns;
};
