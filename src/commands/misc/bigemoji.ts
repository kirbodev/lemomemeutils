import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import safeEmbed from "../../utils/safeEmbed";

export default {
  name: "bigemoji",
  description: "Get the full size version/link of an emoji or emojis.",
  options: [
    {
      name: "emojis",
      description: "The emoji(s) to get the full size version/link of.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  permissionsRequired: [PermissionsBitField.Flags.SendMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const emoji = interaction.options.getString("emojis", true);
    const emojiRegex = /<a?:(?:[^:]+):(?<id>\d+)>/gm;
    const matches = emoji.matchAll(emojiRegex);
    const matchesarr = [
      ...new Set(Array.from(matches).map((match) => match.groups!.id)),
    ];

    const embedarr: EmbedBuilder[] = [];
    for (const match of matchesarr) {
      let emojiUrl = `https://cdn.discordapp.com/emojis/${match}.gif`;
      const res = await fetch(emojiUrl);
      if (!res.ok) {
        emojiUrl = `https://cdn.discordapp.com/emojis/${match}.png`;
        const res2 = await fetch(emojiUrl);
        if (!res2.ok) continue;
      }

      const embed = safeEmbed(
        new EmbedBuilder()
          .setTitle(`Emoji ${embedarr.length + 1}`)
          .setImage(emojiUrl)
          .setColor(EmbedColors.info)
          .setFields([
            {
              name: "Emoji URL",
              value: `[Click here](${emojiUrl})`,
            },
          ])
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp()
      );
      embedarr.push(embed);
    }
    if (embedarr.length === 0) {
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorEmojiNotFound)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }
    interaction.followUp({
      content:
        embedarr.length > 10
          ? "There were more than 10 emojis in your message, they were excluded."
          : undefined,
      embeds: embedarr.splice(0, 10),
    });
  },
} as Command;
