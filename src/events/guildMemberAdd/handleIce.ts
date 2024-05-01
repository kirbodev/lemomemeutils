import type { Client, GuildMember } from "discord.js";
import Action from "../../db/models/action.js";
import configs from "../../config.js";
import logger from "../../helpers/logger.js";

export default async (client: Client, member: GuildMember) => {
  const action = await Action.findOne({
    userID: member.id,
    guildID: member.guild.id,
    actionType: "unban",
    iceSeverity: { $ne: null },
    $or: [
      {
        $and: [
          { iceSeverity: 0 },
          {
            timestamp: {
              // 14 days ago
              $gte: Date.now() - 1000 * 60 * 60 * 24 * 14,
            },
          },
        ],
      },
      {
        $and: [
          { iceSeverity: 1 },
          {
            timestamp: {
              // 30 days ago
              $gte: Date.now() - 1000 * 60 * 60 * 24 * 30,
            },
          },
        ],
      },
    ],
  }).sort({ timestamp: -1 });
  if (!action) return;
  const config = configs.get(member.guild.id)!;
  const thinIceRole = member.guild.roles.cache.find(
    (role) => role.id === config.thinIceRoleID,
  );
  if (!thinIceRole)
    return logger.warn(
      `Thin Ice role not found in ${member.guild.name} (${member.guild.id})`,
    );
  const thinnerIceRole = member.guild.roles.cache.find(
    (role) => role.id === config.thinnerIceRoleID,
  );
  if (!thinnerIceRole)
    return logger.warn(
      `Thinner Ice role not found in ${member.guild.name} (${member.guild.id})`,
    );

  if (action.iceSeverity == 0) {
    try {
      await member.roles.add(thinIceRole);
    } catch (e) {
      return logger.warn(
        `Failed to add thin ice role to ${member.user.tag} (${member.id})`,
      );
    }
  } else {
    try {
      await member.roles.add(thinnerIceRole);
    } catch (e) {
      return logger.warn(
        `Failed to add thinner ice role to ${member.user.tag} (${member.id})`,
      );
    }
  }
};
