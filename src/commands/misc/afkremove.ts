import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionsBitField,
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

async function removeAfk(
  userId: string,
  guildId: string
): Promise<HydratedDocument<afkInterface> | null> {
  const afkData: HydratedDocument<afkInterface> | null = await afk.findOne({
    userID: userId,
    $or: [{ guildID: guildId }, { guildID: { $exists: false } }],
  });

  if (!afkData) return null;
  if (afkData.expiresAt && afkData.expiresAt.getTime() < Date.now())
    return null;

  await afkData.deleteOne();
  return afkData;
}

export default {
  name: "afkremove",
  description: "Remove a user's AFK status.",
  contextName: "Remove AFK",
  options: [
    {
      name: "user",
      description:
        "The user whose AFK to remove. Defaults to yourself. Requires Manage Messages for others.",
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

    const targetUser =
      interaction.options.getUser("user") ?? interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    if (!isSelf) {
      const memberPerms = interaction.member?.permissions as PermissionsBitField | undefined;
      if (!memberPerms?.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.editReply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorPermissions)
                .setDescription(
                  "You need the **Manage Messages** permission to remove another user's AFK status."
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
      }
    }

    const removed = await removeAfk(targetUser.id, interaction.guildId!);

    if (!removed)
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(`<@${targetUser.id}> is not currently AFK.`)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });

    const duration = ms(Date.now() - removed.timestamp!.getTime(), {
      long: true,
    });

    const description = isSelf
      ? `You are no longer AFK. You were AFK for ${duration}.`
      : `<@${targetUser.id}> is no longer AFK. They were AFK for ${duration}.`;

    return interaction.editReply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("AFK Removed")
            .setDescription(description)
            .setColor(EmbedColors.success)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
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

    const isSelf = interaction.targetId === interaction.user.id;

    if (!isSelf) {
      const memberPerms = interaction.member?.permissions as PermissionsBitField | undefined;
      if (!memberPerms?.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.editReply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorPermissions)
                .setDescription(
                  "You need the **Manage Messages** permission to remove another user's AFK status."
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
      }
    }

    const removed = await removeAfk(interaction.targetId, interaction.guildId!);

    if (!removed)
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(`<@${interaction.targetId}> is not currently AFK.`)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });

    const duration = ms(Date.now() - removed.timestamp!.getTime(), {
      long: true,
    });

    const description = isSelf
      ? `You are no longer AFK. You were AFK for ${duration}.`
      : `<@${interaction.targetId}> is no longer AFK. They were AFK for ${duration}.`;

    return interaction.editReply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("AFK Removed")
            .setDescription(description)
            .setColor(EmbedColors.success)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  },
} as Command;
