import { GuildMember } from "discord.js";
import Warn from "../db/models/warn.js";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface.js";
import logger from "./logger.js";

export default async function muteMember(
  member: GuildMember,
  until: Date,
  reason?: string,
) {
  const warns: HydratedDocument<warnInterface>[] = await Warn.find({
    userID: member.id,
    guildID: member.guild.id,
    expiresAt: { $gte: new Date().getTime() },
    withMute: { $exists: true },
    unwarn: { $exists: false },
  });
  // Find mute that expires the latest
  const mute = Math.max(...warns.map((warn) => warn.withMute?.getTime() ?? 0));
  if (mute > until.getTime()) return new Date(mute);
  try {
    await member.disableCommunicationUntil(
      until,
      reason || "No reason provided",
    );
  } catch (e) {
    logger.error(`Failed to mute ${member.user.tag} ${e}`);
    return null;
  }
  // Since a mute can be part of a warn, the caller of this function should save the "mute" action
  return until;
}
