import { HydratedDocument } from "mongoose";
import { Warn } from "../db";
import warnInterface from "../structures/warnInterface";
import type { Client } from "discord.js";
import configs from "../config";
import Job from "../structures/jobInterface";
import getActiveWarns from "../helpers/getActiveWarns";

export default {
  every: "1 hour",
  execute: async (client: Client) => {
    let count = 0;
    const warns: HydratedDocument<warnInterface>[] = await Warn.find();
    // Get all unique user ids
    const users = [...new Set(warns.map((warn) => warn.userID))];
    for (const user of users) {
      const userWarns = warns.filter((w) => w.userID === user);
      for (const guild of [...new Set(userWarns.map((warn) => warn.guildID))]) {
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
        const warnPoints =
          (await getActiveWarns(member))?.reduce(
            (acc, warn) => acc + warn.severity,
            0,
          ) || 0;
        // Check if user has warn roles
        const firstWarnRole = member.roles.cache.get(config.firstWarnRoleID!);
        const secondWarnRole = member.roles.cache.get(config.secondWarnRoleID!);
        // Remove warn roles if they have expired
        let counted = false;
        if (firstWarnRole && warnPoints < 1) {
          await member.roles.remove(firstWarnRole).catch(() => {
            return;
          });
          count++;
          counted = true;
        }
        if (secondWarnRole && warnPoints < 2) {
          await member.roles.remove(secondWarnRole).catch(() => {
            return;
          });
          if (!counted) count++;
        }
      }
    }
    return `Removed warn roles from ${count} users`;
  },
} as Job;
