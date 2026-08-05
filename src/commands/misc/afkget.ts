import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  type ContextMenuCommandInteraction,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import afk from "../../db/models/afk.js";
import type { HydratedDocument } from "mongoose";
import type afkInterface from "../../structures/afkInterface.js";
import EmbedColors from "../../structures/embedColors.js";
import ms from "ms";
import safeEmbed from "../../utils/safeEmbed.js";
import Errors from "../../structures/errors.js";
import { dbStatus } from "../../handlers/errorHandler.js";

async function getAfkEmbed(
  userId: string,
  guildId: string,
  requestedBy: string,
  avatarURL: string
) {
  const afkData: HydratedDocument<afkInterface> | null = await afk.findOne({
    userID: userId,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  if (!afkData) return null;
  if (afkData.guildID && afkData.guildID !== guildId) return null;

  const embed = safeEmbed(
    new EmbedBuilder()
      .setTitle("AFK Status")
      .setDescription(
        `<@${userId}> has been AFK for ${ms(
          Date.now() - afkData.timestamp!.getTime(),
          { long: true }
        )}${afkData.message ? ` with the message: "${afkData.message}"` : ""}${
          afkData.expiresAt
            ? ` until <t:${Math.floor(afkData.expiresAt.getTime() / 1000)}:f>`
            : ""
        }.`
      )
      .setColor(EmbedColors.info)
      .setFooter({
        text: `Requested by ${requestedBy}`,
        iconURL: avatarURL,
      })
      .setTimestamp(Date.now())
  );

  return embed;
}

export default {
  name: "afkget",
  description: "Get a user's AFK status.",
  contextName: "Get AFK status",
  options: [
    {
      name: "user",
      description: "The user to get the AFK status of. Defaults to yourself.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  async slash(interaction) {
    if (dbStatus)
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorServer)
              .setDescription(
                "The database is currently unavailable. Please try again later."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });

    await interaction.deferReply({ ephemeral: true });

    const userId =
      interaction.options.getUser("user")?.id ?? interaction.user.id;
    const embed = await getAfkEmbed(
      userId,
      interaction.guildId!,
      interaction.user.tag,
      interaction.user.displayAvatarURL()
    );

    if (!embed)
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                `<@${userId}> is not currently AFK${
                  userId !== interaction.user.id ? "" : " (in this server)"
                }.`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });

    return interaction.editReply({ embeds: [embed] });
  },
  async contextMenu(interaction: ContextMenuCommandInteraction) {
    if (dbStatus)
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorServer)
              .setDescription(
                "The database is currently unavailable. Please try again later."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });

    await interaction.deferReply({ ephemeral: true });

    const embed = await getAfkEmbed(
      interaction.targetId,
      interaction.guildId!,
      interaction.user.tag,
      interaction.user.displayAvatarURL()
    );

    if (!embed)
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                `<@${interaction.targetId}> is not currently AFK in this server.`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });

    return interaction.editReply({ embeds: [embed] });
  },
} as Command;
