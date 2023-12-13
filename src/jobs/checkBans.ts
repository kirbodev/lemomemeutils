import type { Client } from "discord.js";
import config from "../../config"
import Job from "../structures/jobInterface";
import { Action } from "../db";
import actionInterface from "../structures/actionInterface";
import { HydratedDocument } from "mongoose";

export default {
    every: '1 hour',
    execute: async (client: Client) => {
        let count = 0;
        // Find all bans that have expired
        const bans: HydratedDocument<actionInterface>[] = await Action.find({ actionType: "ban", expiresAt: { $ne: null } });
        // Get all unique user ids
        const users = [...new Set(bans.map(ban => ban.userID))];
        for (const user of users) {
            const userBans = bans.filter(b => b.userID === user);
            // Check for most recent ban
            const mostRecentBan = userBans.sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())[0];
            if (!mostRecentBan) continue;
            if (mostRecentBan.expiresAt && mostRecentBan.expiresAt.getTime() > Date.now()) continue;
            if (mostRecentBan.forceExpired) continue;
            let server = config.mainServer;
            let guildBan;
            try {
                guildBan = await client.guilds.cache.get(config.mainServer)?.bans.fetch(user);
                if (!guildBan) {
                    try {
                        guildBan = await client.guilds.cache.get(config.testServer)?.bans.fetch(user);
                        if (!guildBan) continue;
                        server = config.testServer;
                    } catch (e) {
                        continue;
                    }
                }
            } catch (err) {
                try {
                    guildBan = await client.guilds.cache.get(config.testServer)?.bans.fetch(user);
                    if (!guildBan) continue;
                    server = config.testServer;
                } catch (e) {
                    continue;
                }
            }
            // Unban user
            await client.guilds.cache.get(server)?.bans.remove(user);
            count++;
        }
        return `Unbanned ${count} users`;
    }
} as Job;