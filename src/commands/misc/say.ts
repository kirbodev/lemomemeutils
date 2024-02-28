import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ColorResolvable,
  ApplicationCommandOptionType,
  ChannelType,
  GuildTextBasedChannel,
  Message,
  ModalBuilder,
  ModalActionRowComponentBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import { nanoid } from "nanoid";

export default {
  name: "say",
  description: "Make the bot send an embed or message.",
  options: [
    {
      name: "type",
      description: "The type of message to send",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Message",
          value: "message",
        },
        {
          name: "Embed",
          value: "embed",
        },
      ],
    },
    {
      name: "channel",
      description:
        "The channel to send the message to, if not specified, it will be the current channel.",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "reply_id",
      description:
        "The message to reply to, if not specified, it will not be a reply.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  requiresHighStaff: true,
  async slash(interaction: ChatInputCommandInteraction) {
    // Don't defer reply, we need to send the modal
    const type = interaction.options.getString("type", true) as
      | "message"
      | "embed";
    const channel = interaction.options.getChannel("channel");
    const replyId = interaction.options.getString("reply_id");

    if (replyId && !channel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("You must specify a channel to reply to a message.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        ephemeral: true,
      });
    }

    let msg: Message | undefined;
    if (replyId) {
      const ch = interaction.guild?.channels.cache.get(channel!.id);
      if (!ch || channel?.type !== ChannelType.GuildText) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorChannelNotFound)
              .setDescription(
                "The specified channel was not found or is invalid."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          ephemeral: true,
        });
      }
      (ch as GuildTextBasedChannel).messages
        .fetch(replyId)
        .then((m) => {
          msg = m;
        })
        .catch(() => {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(Errors.ErrorUser)
                .setDescription("The specified message was not found.")
                .setColor(EmbedColors.error)
                .setFooter({
                  text: `Requested by ${interaction.user.tag}`,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp(Date.now()),
            ],
            ephemeral: true,
          });
        });
    }

    if (type === "message") {
      const modalId = nanoid();
      await interaction.showModal(
        new ModalBuilder()
          .setTitle("Send a message")
          .setCustomId(modalId)
          .setComponents([
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId("message")
                .setLabel("Message")
                .setPlaceholder("Hey yall! How's it going?")
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph)
            ),
          ])
      );

      try {
        const modal = await interaction.awaitModalSubmit({
          time: 1000 * 60 * 5,
          filter: (i) => i.customId === modalId,
        });
        const message = modal.fields.getTextInputValue("message");
        modal.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Message Sent")
              .setDescription(message)
              .setColor(EmbedColors.success)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          ephemeral: true,
        });
        if (channel) {
          if (msg) return msg.reply(message);
          return (channel as GuildTextBasedChannel).send(message);
        } else {
          return interaction.channel!.send(message);
        }
      } catch (err) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("You took too long to respond.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          ephemeral: true,
        });
      }
    } else {
      const modalId = nanoid();
      await interaction.showModal(
        new ModalBuilder()
          .setTitle("Send an embed")
          .setCustomId(modalId)
          .setComponents([
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId("title")
                .setLabel("Title")
                .setPlaceholder("My Embed")
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(50)
                .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Description")
                .setPlaceholder("This is my embed, it's pretty cool.")
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId("color")
                .setLabel("Color")
                .setPlaceholder("#ff0000")
                .setRequired(false)
                .setMinLength(7)
                .setMaxLength(7)
                .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId("field1")
                .setLabel("Field 1")
                .setPlaceholder(
                  "Separate title and content with a colon (:). Example - Reason: I think embeds are cool."
                )
                .setRequired(false)
                .setMinLength(3)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId("image")
                .setLabel("Image URL")
                .setPlaceholder(
                  "https://picsum.photos/seed/pomegranate/1920/1080"
                )
                .setRequired(false)
                .setMinLength(10)
                .setMaxLength(100)
                .setStyle(TextInputStyle.Short)
            ),
          ])
      );

      try {
        const modal = await interaction.awaitModalSubmit({
          time: 1000 * 60 * 5,
          filter: (i) => i.customId === modalId,
        });
        const title = modal.fields.getTextInputValue("title");
        const description = modal.fields.getTextInputValue("description");
        const color = modal.fields.getTextInputValue(
          "color"
        ) as ColorResolvable;
        const field1 = modal.fields.getTextInputValue("field1");
        const image = modal.fields.getTextInputValue("image");
        const message = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(color)
          .setImage(image)
          .setTimestamp(Date.now())
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          });
        if (field1) {
          const [name, value] = field1.split(":");
          message.setFields({
            name: name,
            value: value,
          });
        }
        modal.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Embed Sent")
              .setColor(EmbedColors.success)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          ephemeral: true,
        });
        if (channel) {
          if (msg)
            return msg.reply({
              embeds: [message],
            });
          return (channel as GuildTextBasedChannel).send({
            embeds: [message],
          });
        } else {
          return interaction.channel!.send({
            embeds: [message],
          });
        }
      } catch (err) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("You took too long to respond.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          ephemeral: true,
        });
      }
    }
  },
} as Command;
