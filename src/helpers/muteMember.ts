import { GuildMember } from "discord.js";
import { Warn } from "../db";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface";

export default async function muteMember(member: GuildMember, until: Date, reason?: string) {
    const warns: HydratedDocument<warnInterface>[] = await Warn.find({ userID: member.id, guildID: member.guild.id, expiresAt: { $gte: new Date().getTime() }, withMute: { $exists: true }, unwarn: { $exists: false } });
    // Find mute that expires the latest
    const mute = Math.max(...warns.map(warn => warn.withMute?.getTime() ?? 0));
    if (mute > until.getTime()) return new Date(mute);
    await member.disableCommunicationUntil(until, reason || "No reason provided");
    // Since a mute can be part of a warn, the caller of this function should save the "mute" action
    return until;
}