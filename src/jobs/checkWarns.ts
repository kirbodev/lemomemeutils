import { HydratedDocument } from "mongoose";
import { Warn } from "../db"
import warnInterface from "../structures/warnInterface";
import type { Client } from "discord.js";
import config from "../../config.json";
import Job from "../structures/jobInterface";

export default {
    every: '1 hour',
    execute: async (client: Client) => {
        let count = 0;
        // Find all warns that have expired
        const warns: HydratedDocument<warnInterface>[] = await Warn.find();
        // Get all unique user ids
        const users = [...new Set(warns.map(warn => warn.userID))];
        for (const user of users) {
            // Get member from guild
            let member = await client.guilds.cache.get(config.mainServer)?.members.fetch({
                user: user
            });
            if (!member) {
                member = await client.guilds.cache.get(config.testServer)?.members.fetch({
                    user: user
                });
                if (!member) continue;
            }
            // Get all warns for the user
            const userWarns = warns.filter(warn => warn.userID === user);
            // Check for warn roles on the member
            const firstWarnRole = member.roles.cache.get(config.firstWarnRoleID);
            const secondWarnRole = member.roles.cache.get(config.secondWarnRoleID);

            let firstWarn = false;
            let secondWarn = false;
            for (const warn of userWarns) {
                if (warn.severity === 1 && warn.expiresAt.getTime() > Date.now() && warn.forceExpired === false) firstWarn = true;
                if (warn.severity === 2 && warn.expiresAt.getTime() > Date.now() && warn.forceExpired === false) secondWarn = true;
            }
            // Remove warn roles if they have expired
            if (firstWarnRole && !firstWarn) {
                await member.roles.remove(firstWarnRole)
                count++
            }
            if (secondWarnRole && !secondWarn) {
                await member.roles.remove(secondWarnRole)
                count++;
            }
        }
        return `Removed warn roles from ${count} users`;
    }
} as Job;