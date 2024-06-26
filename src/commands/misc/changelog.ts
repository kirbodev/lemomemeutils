import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import changelog from "../../changelog.js";
import EmbedColors from "../../structures/embedColors.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "changelog",
  description: "Shows the most recent changelog for the bot.",
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const changes = changelog.changelog.map((change) => `- ${change}`);
    interaction.followUp({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(`${changelog.version} | ${changelog.name}`)
            .setDescription(changelog.description)
            .setFields([
              {
                name: "Release Date",
                value: `<t:${Math.floor(changelog.date.getTime() / 1000)}:d>`,
              },
              {
                name: "Changes",
                value: changes.join("\n"),
              },
            ])
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  },
  message(interaction: Message) {
    const changes = changelog.changelog.map((change) => `- ${change}`);
    interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(`${changelog.version} | ${changelog.name}`)
            .setDescription(changelog.description)
            .setFields([
              {
                name: "Release Date",
                value: `<t:${Math.floor(changelog.date.getTime() / 1000)}:d>`,
              },
              {
                name: "Changes",
                value: changes.join("\n"),
              },
            ])
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  },
} as Command;
