import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import ms from "ms";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import afk from "../../db/models/afk.js";
import type afkInterface from "../../structures/afkInterface.js";
import { type HydratedDocument } from "mongoose";
import safeEmbed from "../../utils/safeEmbed.js";

const MAX_AFK_MESSAGE_LENGTH = 1024;
const MIN_AFK_DURATION = 10000;
const MAX_AFK_DURATION = 1000 * 60 * 60 * 24 * 14;

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
      autocomplete: true,
    },
    {
      name: "attachment",
      description: "The attachment to display when someone mentions you.",
      type: ApplicationCommandOptionType.Attachment,
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
    let message = interaction.options.getString("message") ?? undefined;
    const expiresraw = interaction.options.getString("expires");
    let expires = expiresraw ? ms(expiresraw) : undefined;
    if (expires && expires < MIN_AFK_DURATION) expires = undefined;
    const attachment = interaction.options.getAttachment("attachment")?.url;

    if (attachment) message = `${attachment} ${message || ""}`.trim();

    if (
      expiresraw &&
      (!expires || isNaN(expires) || expires > MAX_AFK_DURATION)
    ) {
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorInvalidTime)
              .setDescription(
                "The time must be between 10 seconds and 14 days."
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
    if (message && message.length > MAX_AFK_MESSAGE_LENGTH) {
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("The message must be less than 1024 characters.")
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
        safeEmbed(
          new EmbedBuilder()
            .setTitle("AFK Set")
            .setDescription(
              `You are now AFK${
                message ? ` with the message: "${message}"` : ""
              }${
                expiresAt
                  ? ` until <t:${Math.floor(
                      Afk.expiresAt!.getTime() / 1000
                    )}:f>`
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
            .setTimestamp()
        ),
      ],
    });
  },
  async message(interaction, { args }) {
    args = args ?? [];
    // Only treat the last arg as a time if ms() can actually parse it
    const lastArg = args[args.length - 1];
    const parsedMs = lastArg ? ms(lastArg) : undefined;
    const expires =
      parsedMs !== undefined && !isNaN(parsedMs) && parsedMs >= MIN_AFK_DURATION
        ? parsedMs
        : undefined;
    const usedExpires = expires !== undefined;

    let message =
      args.slice(0, usedExpires ? args.length - 1 : args.length).join(" ") ||
      undefined;
    const attachment = interaction.attachments.first()?.url;
    if (attachment) message = `${attachment} ${message || ""}`.trim();
    if (usedExpires && expires! > MAX_AFK_DURATION) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorInvalidTime)
              .setDescription(
                "The time must be between 10 seconds and 14 days."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }
    if (message && message.length > MAX_AFK_MESSAGE_LENGTH) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("The message must be less than 1024 characters.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
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
        safeEmbed(
          new EmbedBuilder()
            .setTitle("AFK Set")
            .setDescription(
              `You are now AFK${
                message ? ` with the message: "${message}"` : ""
              }${
                expiresAt
                  ? ` until <t:${Math.floor(
                      Afk.expiresAt!.getTime() / 1000
                    )}:f>`
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
            .setTimestamp()
        ),
      ],
    });
  },
} as Command;
