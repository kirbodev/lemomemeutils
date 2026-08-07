import { Guild } from "discord.js";
import Fuse from "fuse.js";
import { client } from "../index.js";
import { hasGuildMembers } from "./capabilities.js";

// Fetching the full member list requires the Guild Members privileged intent.
// Without it, name search simply runs against the (small) cache.
if (hasGuildMembers()) {
  for (const guild of client.guilds.cache.values()) {
    guild.members.fetch();
  }
}
export default async function lazyMemberSearch(name: string, guild: Guild) {
  // find the member with the closest username to the name
  const members = guild.members.cache;
  // fuzzy search the members
  const member = members.find((m) =>
    m.user.username.toLowerCase().includes(name.toLowerCase())
  );
  if (member) return member;
  const nickMember = members.find((m) =>
    m.displayName.toLowerCase().includes(name.toLowerCase())
  );
  if (nickMember) return nickMember;
  // if no member was found, use the fuse search
  const fuse = new Fuse(
    members.map((m) => m.user.username),
    {
      threshold: 0.3,
    }
  );
  const result = fuse.search(name, {
    limit: 1,
  });
  if (result.length === 0) return null;
  return members.find((m) => m.user.username === result[0].item) || null;
}
