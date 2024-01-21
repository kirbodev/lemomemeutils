import type { Client } from "discord.js";
import Job from "../structures/jobInterface";
import { Action } from "../db";
import actionInterface from "../structures/actionInterface";
import { HydratedDocument } from "mongoose";

export default {
    every: '1 hour',
    execute: async (client: Client) => {
        let count = 0;
        // Find all bans
        const bans: HydratedDocument<actionInterface>[] = await Action.find({ actionType: "ban" });
        // Find all expired bans
        const ebans = bans.filter(ban => ban.expiresAt && ban.expiresAt.getTime() < Date.now());
        // Get all unique user ids
        const users = [...new Set(ebans.map(ban => ban.userID))];
        for (const user of users) {
            const userBans = bans.filter(b => b.userID === user);
            // Check for most recent ban
            const mostRecentBan = userBans.sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())[0];
            if (!mostRecentBan) continue;
            if (mostRecentBan.expiresAt && mostRecentBan.expiresAt.getTime() > Date.now()) continue;
            if (!mostRecentBan.expiresAt) continue;
            if (mostRecentBan.forceExpired) continue;
            // Find the ban in the guild
            try {
                await client.guilds.cache.get(mostRecentBan.guildID)?.bans.fetch(user);
            } catch (e) {
                continue;
            }
            // Unban the user
            await client.guilds.cache.get(mostRecentBan.guildID)?.members.unban(user, "Ban expired");
            count++;
        }
        return `Unbanned ${count} users`;
    }
} as Job;