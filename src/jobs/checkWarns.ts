import { HydratedDocument } from "mongoose";
import { Warn } from "../db"
import warnInterface from "../structures/warnInterface";
import type { Client } from "discord.js";
import configs from "../config";
import Job from "../structures/jobInterface";

export default {
    every: '1 hour',
    execute: async (client: Client) => {
        let count = 0;
        const warns: HydratedDocument<warnInterface>[] = await Warn.find();
        // Get all unique user ids
        const users = [...new Set(warns.map(warn => warn.userID))];
        for (const user of users) {
            const userWarns = warns.filter(w => w.userID === user);
            for (const guild of userWarns.map(warn => warn.guildID)) {
                const config = configs.get(guild)!;
                // Get member from guild
                let member;
                try {
                    member = await client.guilds.cache.get(guild)?.members.fetch(user);
                    if (!member) continue;
                } catch (e) {
                    continue;
                }
                // Get the warn points for the user by adding the severity of all active warns
                let warnPoints = 0;
                for (const warn of userWarns) {
                    if (warn.unwarn || warn.expiresAt.getTime() < Date.now()) continue;
                    warnPoints += warn.severity;
                }
                // Check if user has warn roles
                const firstWarnRole = member.roles.cache.get(config.firstWarnRoleID!);
                const secondWarnRole = member.roles.cache.get(config.secondWarnRoleID!);
                // Remove warn roles if they have expired
                let counted = false;
                if (firstWarnRole && warnPoints < 1) {
                    await member.roles.remove(firstWarnRole);
                    count++;
                    counted = true;
                }
                if (secondWarnRole && warnPoints < 2) {
                    await member.roles.remove(secondWarnRole);
                    if (!counted) count++;
                }
            }
        }
        return `Removed warn roles from ${count} users`;
    }
} as Job;