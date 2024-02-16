import type { Client } from "discord.js";
import configs from "../config";
import Job from "../structures/jobInterface";
import { Action } from "../db";
import actionInterface from "../structures/actionInterface";
import { HydratedDocument } from "mongoose";

export default {
  every: "1 hour",
  execute: async (client: Client) => {
    let count = 0;
    const pardons: HydratedDocument<actionInterface>[] = await Action.find({
      withParole: { $ne: false },
    });
    // Get all unique user ids
    const users = [...new Set(pardons.map((pardon) => pardon.userID))];
    for (const user of users) {
      // Get all pardons for the user
      const userPardons = pardons.filter((pardon) => pardon.userID === user);
      for (const guild of userPardons.map((pardon) => pardon.guildID)) {
        const config = configs.get(guild)!;
        // Get member from guild
        let member;
        try {
          member = await client.guilds.cache.get(guild)?.members.fetch(user);
          if (!member) continue;
        } catch (e) {
          continue;
        }
        // Check for parole role on the member
        const paroleRole = member?.roles.cache.get(config.paroleRoleID);

        let parole = false;
        for (const pardon of userPardons) {
          if (
            typeof pardon.withParole != "boolean" &&
            (pardon.withParole as Date).getTime() > Date.now()
          )
            parole = true;
        }
        // Remove parole role if it has expired
        if (paroleRole && !parole) {
          await member?.roles.remove(paroleRole);
          count++;
        }
      }
    }
    return `Removed parole roles from ${count} users`;
  },
} as Job;
