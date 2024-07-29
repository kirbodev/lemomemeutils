import { Client, GuildMember } from "discord.js";
import { getNameLock } from "../../db/schemas/namelocks";

export default (client: Client) => {
  client.on("guildMemberUpdate", async (oldMember: GuildMember, newMember: GuildMember) => {
    if (oldMember.nickname === newMember.nickname) return;

    const guildId = newMember.guild.id;
    const userId = newMember.id;

    const nameLock = await getNameLock(guildId, userId);
    if (!nameLock) return;

    if (newMember.nickname !== nameLock.lockedName) {
      try {
        await newMember.setNickname(nameLock.lockedName);
        console.log(`Reverted nickname change for ${newMember.user.tag} to ${nameLock.lockedName}`);
      } catch (error) {
        console.error(`Failed to revert nickname change for ${newMember.user.tag}:`, error);
      }
    }
  });
};
