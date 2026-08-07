import type { GuildMember, Guild, Snowflake } from "discord.js";

// Fetches a single member. Unlike a full member list, fetching a member by
// their ID works even without the Guild Members privileged intent, so this is
// a safe drop-in replacement for `guild.members.cache.get(userId)`.
export default async function getGuildMember(
  guild: Guild,
  userId: Snowflake
): Promise<GuildMember | null> {
  const cached = guild.members.cache.get(userId);
  if (cached) return cached;
  return guild.members.fetch(userId).catch(() => null);
}