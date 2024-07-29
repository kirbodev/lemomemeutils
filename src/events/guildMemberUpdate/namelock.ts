import type { Client, GuildMember } from "discord.js";
import { getNameLock } from "../../db/models/namelock";
import logger from "../../helpers/logger.js";

export default async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {
  if (oldMember.nickname === newMember.nickname) return;

  const guildId = newMember.guild.id;
  const userId = newMember.id;

  const nameLock = await getNameLock(guildId, userId);
  if (!nameLock) return;

  if (newMember.nickname !== nameLock.lockedName) {
    try {
      await newMember.setNickname(nameLock.lockedName);
    } catch (error) {
      logger.error(`Failed to revert nickname change for ${newMember.user.tag}: ${error}`);
    }
  }
};
