import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import ms from "ms";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import afk from "../../db/models/afk";
import afkInterface from "../../structures/afkInterface";
import { HydratedDocument } from "mongoose";

export default {
  name: "afk",
  description: "Set your AFK status.",
  permissionsRequired: [PermissionFlagsBits.SendMessages],
  options: [
    {
      name: "message",
      description: "The message to display when someone mentions you.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "expires",
      description: "How long until you are no longer AFK.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async slash(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const message = interaction.options.getString("message");
    const expiresraw = interaction.options.getString("expires");
    const expires = expiresraw ? ms(expiresraw) : undefined;

    if (
      expiresraw &&
      (!expires ||
        isNaN(expires) ||
        expires < 10000 ||
        expires > 1000 * 60 * 60 * 24 * 14)
    ) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorInvalidTime)
            .setDescription("The time must be between 10 seconds and 14 days.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(),
        ],
      });
    }
    if (message && message.length > 1024) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("The message must be less than 1024 characters.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(),
        ],
      });
    }

    const expiresAt = expires ? new Date(Date.now() + expires) : undefined;

    const existingAfk: HydratedDocument<afkInterface> | null =
      await afk.findOne({
        userID: interaction.user.id,
        guildID: interaction.guildId!,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date().getTime() } },
        ],
      });
    if (existingAfk) await existingAfk.deleteOne();

    const Afk = new afk<afkInterface>({
      userID: interaction.user.id,
      guildID: interaction.guildId!,
      message: message || undefined,
      expiresAt: expiresAt,
    });
    await Afk.save();

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("AFK Set")
          .setDescription(
            `You are now AFK${
              message ? ` with the message: "${message}"` : ""
            }${
              expiresAt
                ? ` until <t:${Math.floor(Afk.expiresAt.getTime() / 1000)}:f>`
                : ""
            }.${
              existingAfk
                ? " Your previous AFK status has been overwritten."
                : ""
            }`
          )
          .setColor(EmbedColors.success)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(),
      ],
    });
  },
  async message(interaction, { args }) {
    args = args ?? [];
    const expiresraw = args[args.length - 1];
    let expires = expiresraw ? ms(expiresraw) : undefined;
    if (isNaN(expires)) expires = null;
    const message =
      args.slice(0, expires ? args.length - 1 : args.length).join(" ") ||
      undefined;
    if (
      expires &&
      (!expires ||
        expires < 10000 ||
        expires > 1000 * 60 * 60 * 24 * 14)
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorInvalidTime)
            .setDescription("The time must be between 10 seconds and 14 days.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(),
        ],
      });
    }
    if (message && message.length > 1024) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("The message must be less than 1024 characters.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(),
        ],
      });
    }

    const expiresAt = expires ? new Date(Date.now() + expires) : undefined;

    const existingAfk: HydratedDocument<afkInterface> | null =
      await afk.findOne({
        userID: interaction.author.id,
        guildID: interaction.guildId!,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date().getTime() } },
        ],
      });
    if (existingAfk) await existingAfk.deleteOne();

    const Afk = new afk<afkInterface>({
      userID: interaction.author.id,
      guildID: interaction.guildId!,
      message: message || undefined,
      expiresAt: expiresAt,
    });
    await Afk.save();

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("AFK Set")
          .setDescription(
            `You are now AFK${
              message ? ` with the message: "${message}"` : ""
            }${
              expiresAt
                ? ` until <t:${Math.floor(Afk.expiresAt.getTime() / 1000)}:f>`
                : ""
            }.${
              existingAfk
                ? " Your previous AFK status has been overwritten."
                : ""
            }`
          )
          .setColor(EmbedColors.success)
          .setFooter({
            text: `Requested by ${interaction.author.tag}`,
            iconURL: interaction.author.displayAvatarURL(),
          })
          .setTimestamp(),
      ],
    });
  },
} as Command;
