import { ButtonBuilder, ButtonStyle, User } from "discord.js";

export default function getBanButton(user: User, reason: string) {
  const id = `ban-${user.id}-${reason.toLowerCase().replace(/ /g, "-")}`;
  return new ButtonBuilder()
    .setCustomId(id)
    .setLabel("Ban")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🔨");
}
