// Get the active warns for a user and find the associated roles to apply to them

import configs from "../../config";
import logger from "../../helpers/logger";
import { Client, GuildMember } from "discord.js";
import getActiveWarns from "../../helpers/getActiveWarns";

export default async (client: Client, member: GuildMember) => {
    const warns = await getActiveWarns(member);
    if (!warns || !warns[0]) return;
    const config = configs.get(member.guild.id)!;
    const warnPoints = warns.reduce((acc, warn) => acc + (warn.severity), 0);

    const role = warnPoints === 1 ? config.firstWarnRoleID : config.secondWarnRoleID;

    try {
        if (role) await member.roles.add(role);
        if (warnPoints > 1) await member.roles.add(config.firstWarnRoleID);
    } catch (e) {
        return logger.warn(`Failed to add warn role to ${member.user.tag} (${member.id})`);
    }
};