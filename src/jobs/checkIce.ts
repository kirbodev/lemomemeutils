import type { Client } from "discord.js";
import configs from "../config";
import Job from "../structures/jobInterface";
import { Action } from "../db";
import actionInterface from "../structures/actionInterface";
import { HydratedDocument } from "mongoose";

export default {
    every: '1 hour',
    execute: async (client: Client) => {
        let count = 0;
        const ices: HydratedDocument<actionInterface>[] = await Action.find({ iceSeverity: { $ne: null } });
        // Get all unique user ids
        const users = [...new Set(ices.map(ice => ice.userID))];
        for (const user of users) {
            // Get all ices for the user
            const userIces = ices.filter(ice => ice.userID === user);
            for (const guild of userIces.map(ice => ice.guildID)) {
                const config = configs.get(guild)!;
                // Get member from guild
                let member;
                try {
                    member = await client.guilds.cache.get(guild)?.members.fetch(user);
                    if (!member) continue;
                } catch (e) {
                    continue;
                }
                let thinIce;
                let thinnerIce;
                for (const ice of userIces) {
                    if (ice.iceSeverity == 0 && Date.now() < (ice.timestamp as Date).getTime() + 1000 * 60 * 60 * 24 * 14) thinIce = true;
                    if (ice.iceSeverity == 1 && Date.now() < (ice.timestamp as Date).getTime() + 1000 * 60 * 60 * 24 * 30) thinnerIce = true;
                }
                // Check if user has thin ice role
                const thinIceRole = member?.roles.cache.get(config.thinIceRoleID!);
                // Check if user has thinner ice role
                const thinnerIceRole = member?.roles.cache.get(config.thinnerIceRoleID!);
                // Remove thin ice role if it has expired
                if (thinIceRole && !thinIce) {
                    await member?.roles.remove(thinIceRole);
                    count++;
                }
                // Remove thinner ice role if it has expired
                if (thinnerIceRole && !thinnerIce) {
                    await member?.roles.remove(thinnerIceRole);
                    count++;
                }
            }
        }
        return `Removed thin/thinner ice roles from ${count} users`;
    }
} as Job;