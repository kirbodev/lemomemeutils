import { GuildMember } from "discord.js";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface.js";
import configs from "../config.js";
import getActiveWarns from "./getActiveWarns.js";

export default async function unwarnMember(
  warn: HydratedDocument<warnInterface>,
  mod: GuildMember,
  reason?: string
) {
  if (!warn) return;
  if (warn.unwarn) return;
  warn.unwarn = {
    moderatorID: mod.id,
    reason,
  };
  await warn.save();
  const member = await mod.guild.members.fetch(warn.userID);
  // Remove the warn role
  const config = configs.get(member.guild.id)!;
  const warns = await getActiveWarns(member);
  if (!warns) return;
  const warnPoints = warns.reduce((a, b) => a + b.severity, 0);
  const role =
    warnPoints === 0
      ? config.firstWarnRoleID
      : warnPoints === 1
      ? config.secondWarnRoleID
      : null;
  if (role) await member.roles.remove(role);
  if (warnPoints < 1) await member.roles.remove(config.firstWarnRoleID);
  // Remove the mute
  if (warn.withMute) await member.disableCommunicationUntil(null);
  return warn;
}
