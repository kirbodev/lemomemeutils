// Get the active warns for a user and find the associated roles to apply to them

import { HydratedDocument } from "mongoose";
import { Warn } from "../../db";
import configs from "../../config";
import logger from "../../helpers/logger";
import warnInterface from "../../structures/warnInterface";
import { Client, GuildMember } from "discord.js";

export default async (client: Client, member: GuildMember) => {
    const warns: HydratedDocument<warnInterface>[] = await Warn.find({ userID: member.id, guildID: member.guild.id, expiresAt: { $gte: new Date().getTime() }, unwarn: { $exists: false } });
    const config = configs.get(member.guild.id)!;
    const warnPoints = warns.reduce((acc, warn) => acc + (warn.severity), 0);

    const role = warnPoints === 1 ? config.firstWarnRoleID : config.secondWarnRoleID;

    try {
        if (role) await member.roles.add(role);
    } catch (e) {
        return logger.warn(`Failed to add warn role to ${member.user.tag} (${member.id})`);
    }
};