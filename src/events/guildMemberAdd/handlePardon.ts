// Check if user has an unban action with parole, if so, add the parole date to the unban action and add parole role to user. Remember to recommend ban on warn during parole
import type { Client, GuildMember } from "discord.js";
import { Action } from "../../db";
import config from "../../../config";
import logger from "../../helpers/logger";

export default async (client: Client, member: GuildMember) => {
    const action = await Action.findOne({ userID: member.id, withParole: { $ne: false } }).sort({timestamp: -1});
    if (!action) return;
    const paroleRole = member.guild.roles.cache.find(role => role.id === config.paroleRoleID);
    if (!paroleRole) return logger.warn(`Parole role not found in ${member.guild.name} (${member.guild.id})`);

    if (action.withParole == true) {
        try {
            await member.roles.add(paroleRole);
        } catch (e) {
            return logger.warn(`Failed to add parole role to ${member.user.tag} (${member.id})`);
        }
        
        action.withParole = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
        await action.save();

        setTimeout(async () => {
            try {
                await member.roles.remove(paroleRole);
            } catch (e) {
                return logger.warn(`Failed to remove parole role from ${member.user.tag} (${member.id})`);
            }
        }, 1000 * 60 * 60 * 24 * 7);
    } else {
        try {
            await member.roles.add(paroleRole);
        } catch (e) {
            return logger.warn(`Failed to add parole role to ${member.user.tag} (${member.id})`);
        }

        setTimeout(async () => {
            try {
                await member.roles.remove(paroleRole);
            } catch (e) {
                return logger.warn(`Failed to remove parole role from ${member.user.tag} (${member.id})`);
            }
        }, (action.withParole as Date).getTime() - Date.now());
    }
};