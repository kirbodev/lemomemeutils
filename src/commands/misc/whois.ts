import { PermissionsBitField, EmbedBuilder } from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import { KV } from "../../db";
import kvInterface from "../../structures/kvInterface";
import { HydratedDocument } from "mongoose";

export default {
  name: "whois",
  description:
    "Reply to a bot message with this command to see the sender's information.",
  permissionsRequired: [PermissionsBitField.Flags.SendMessages],
  async message(interaction) {
    if (!interaction.reference) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMessageNotFound)
            .setDescription(
              "You need to reply to a bot message to use this command."
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    const ref = await interaction.fetchReference();
    if (ref.author.id !== interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMessageNotFound)
            .setDescription(
              "You need to reply to a bot message to use this command."
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    if (ref.embeds.length > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMessageNotFound)
            .setDescription(
              "Embeds are not supported by whois, check the footer for the user's tag."
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }

    const author: HydratedDocument<kvInterface> | null = await KV.findOne({
      key: `botmsg-${interaction.reference.messageId}`,
    });
    if (!author) {
      const embed = new EmbedBuilder()
        .setTitle("Whois | Genuine")
        .setDescription(
          "This is a genuine bot message. It was not sent by a user."
        )
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.author.tag}`,
          iconURL: interaction.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now());
      if (Date.now() < new Date(2024, 2, 8, 0, 0, 0, 0).getTime()) {
        embed.setFields([
          {
            name: "Disclaimer",
            value:
              "If this message was sent by a user before the whois system was implemented, it will be considered genuine. This disclaimer will be removed <t:1709856000:R>.",
          },
        ]);
      }
      return interaction.reply({
        embeds: [embed],
      });
    }
    const user = await interaction.guild?.members.fetch(author.value);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Whois")
          .setDescription(
            `This message was sent by <@${author.value}> (${
              user?.user.tag || "Unknown name"
            }).`
          )
          .setColor(EmbedColors.info)
          .setFooter({
            text: `Requested by ${interaction.author.tag}`,
            iconURL: interaction.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });
  },
} as Command;
