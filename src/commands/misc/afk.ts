import {
  ApplicationCommandOptionType,
  // EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
// import ms from "ms";
// import Errors from "../../structures/errors.js";
// import EmbedColors from "../../structures/embedColors.js";
// import afk from "../../db/models/afk.js";
// import afkInterface from "../../structures/afkInterface.js";
// import { HydratedDocument } from "mongoose";
// import safeEmbed from "../../utils/safeEmbed.js";
import sendDeprecatedMessage from "../../helpers/sendDeprecatedMessage.js";

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
    sendDeprecatedMessage(interaction);
    // await interaction.deferReply({ ephemeral: true });
    // let message = interaction.options.getString("message");
    // const expiresraw = interaction.options.getString("expires");
    // let expires = expiresraw ? ms(expiresraw) : undefined;
    // if (expires && expires < 10000) expires = undefined;
    // const attachment = interaction.options.getAttachment("attachment")?.url;

    // if (attachment) message = `${attachment} ${message || ""}`;

    // if (
    //   expiresraw &&
    //   (!expires || isNaN(expires) || expires > 1000 * 60 * 60 * 24 * 14)
    // ) {
    //   return interaction.editReply({
    //     embeds: [
    //       safeEmbed(
    //         new EmbedBuilder()
    //           .setTitle(Errors.ErrorInvalidTime)
    //           .setDescription(
    //             "The time must be between 10 seconds and 14 days."
    //           )
    //           .setColor(EmbedColors.error)
    //           .setFooter({
    //             text: `Requested by ${interaction.user.tag}`,
    //             iconURL: interaction.user.displayAvatarURL(),
    //           })
    //           .setTimestamp(Date.now())
    //       ),
    //     ],
    //   });
    // }
    // if (message && message.length > 1024) {
    //   return interaction.editReply({
    //     embeds: [
    //       safeEmbed(
    //         new EmbedBuilder()
    //           .setTitle(Errors.ErrorUser)
    //           .setDescription("The message must be less than 1024 characters.")
    //           .setColor(EmbedColors.error)
    //           .setFooter({
    //             text: `Requested by ${interaction.user.tag}`,
    //             iconURL: interaction.user.displayAvatarURL(),
    //           })
    //           .setTimestamp(Date.now())
    //       ),
    //     ],
    //   });
    // }

    // const expiresAt = expires ? new Date(Date.now() + expires) : undefined;

    // const existingAfk: HydratedDocument<afkInterface> | null =
    //   await afk.findOne({
    //     userID: interaction.user.id,
    //     guildID: interaction.guildId!,
    //     $or: [
    //       { expiresAt: { $exists: false } },
    //       { expiresAt: { $gt: new Date().getTime() } },
    //     ],
    //   });
    // if (existingAfk) await existingAfk.deleteOne();

    // const Afk = new afk<afkInterface>({
    //   userID: interaction.user.id,
    //   guildID: interaction.guildId!,
    //   message: message || undefined,
    //   expiresAt: expiresAt,
    // });
    // await Afk.save();

    // return interaction.editReply({
    //   embeds: [
    //     safeEmbed(
    //       new EmbedBuilder()
    //         .setTitle("AFK Set")
    //         .setDescription(
    //           `You are now AFK${
    //             message ? ` with the message: "${message}"` : ""
    //           }${
    //             expiresAt
    //               ? ` until <t:${Math.floor(
    //                   Afk.expiresAt!.getTime() / 1000
    //                 )}:f>`
    //               : ""
    //           }.${
    //             existingAfk
    //               ? " Your previous AFK status has been overwritten."
    //               : ""
    //           }`
    //         )
    //         .setColor(EmbedColors.success)
    //         .setFooter({
    //           text: `Requested by ${interaction.user.tag}`,
    //           iconURL: interaction.user.displayAvatarURL(),
    //         })
    //         .setTimestamp()
    //     ),
    //   ],
    // });
  },
  async message(/*interaction, { args }*/) {
    //NOTE - Deprecated
    // args = args ?? [];
    // const expiresraw = args[args.length - 1];
    // let expires = expiresraw ? ms(expiresraw) : undefined;
    // if (expires && isNaN(expires)) expires = undefined;
    // if (expires && expires < 10000) expires = undefined;
    // let message =
    //   args.slice(0, expires ? args.length - 1 : args.length).join(" ") ||
    //   undefined;
    // const attachment = interaction.attachments.first()?.url;
    // if (attachment) message = `${attachment} ${message || ""}`;
    // if (expires && (!expires || expires > 1000 * 60 * 60 * 24 * 14)) {
    //   return interaction.reply({
    //     embeds: [
    //       safeEmbed(
    //         new EmbedBuilder()
    //           .setTitle(Errors.ErrorInvalidTime)
    //           .setDescription(
    //             "The time must be between 10 seconds and 14 days."
    //           )
    //           .setColor(EmbedColors.error)
    //           .setFooter({
    //             text: `Requested by ${interaction.author.tag}`,
    //             iconURL: interaction.author.displayAvatarURL(),
    //           })
    //           .setTimestamp(Date.now())
    //       ),
    //     ],
    //   });
    // }
    // if (message && message.length > 1024) {
    //   return interaction.reply({
    //     embeds: [
    //       safeEmbed(
    //         new EmbedBuilder()
    //           .setTitle(Errors.ErrorUser)
    //           .setDescription("The message must be less than 1024 characters.")
    //           .setColor(EmbedColors.error)
    //           .setFooter({
    //             text: `Requested by ${interaction.author.tag}`,
    //             iconURL: interaction.author.displayAvatarURL(),
    //           })
    //           .setTimestamp(Date.now())
    //       ),
    //     ],
    //   });
    // }
    // const expiresAt = expires ? new Date(Date.now() + expires) : undefined;
    // const existingAfk: HydratedDocument<afkInterface> | null =
    //   await afk.findOne({
    //     userID: interaction.author.id,
    //     guildID: interaction.guildId!,
    //     $or: [
    //       { expiresAt: { $exists: false } },
    //       { expiresAt: { $gt: new Date().getTime() } },
    //     ],
    //   });
    // if (existingAfk) await existingAfk.deleteOne();
    // const Afk = new afk<afkInterface>({
    //   userID: interaction.author.id,
    //   guildID: interaction.guildId!,
    //   message: message || undefined,
    //   expiresAt: expiresAt,
    // });
    // await Afk.save();
    // return interaction.reply({
    //   embeds: [
    //     safeEmbed(
    //       new EmbedBuilder()
    //         .setTitle("AFK Set")
    //         .setDescription(
    //           `You are now AFK${
    //             message ? ` with the message: "${message}"` : ""
    //           }${
    //             expiresAt
    //               ? ` until <t:${Math.floor(
    //                   Afk.expiresAt!.getTime() / 1000
    //                 )}:f>`
    //               : ""
    //           }.${
    //             existingAfk
    //               ? " Your previous AFK status has been overwritten."
    //               : ""
    //           }`
    //         )
    //         .setColor(EmbedColors.success)
    //         .setFooter({
    //           text: `Requested by ${interaction.author.tag}`,
    //           iconURL: interaction.author.displayAvatarURL(),
    //         })
    //         .setTimestamp()
    //     ),
    //   ],
    // });
  },
} as Command;
