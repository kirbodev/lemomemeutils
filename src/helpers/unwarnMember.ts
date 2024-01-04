import { GuildMember } from "discord.js";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface";
import configs from "../config";

export default async function unwarnMember(warn: HydratedDocument<warnInterface>, mod: GuildMember, reason?: string) {
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
    const role = warn.severity === 1 ? config.firstWarnRoleID : config.secondWarnRoleID;
    if (role) await member.roles.remove(role);
    // Remove the mute
    console.log(warn.withMute)
    if (warn.withMute) await member.disableCommunicationUntil(null);
    return warn;
}