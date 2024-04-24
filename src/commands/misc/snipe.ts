import {
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  TextChannel,
  ComponentType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  User,
  Message,
  ButtonInteraction,
  StringSelectMenuBuilder,
} from "discord.js";
import snipe from "../../db/models/snipe";
import safeEmbed from "../../utils/safeEmbed";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import type Command from "../../structures/commandInterface";
import { nanoid } from "nanoid";
import moment from "moment";
import { HydratedDocument } from "mongoose";
import snipeInterface from "../../structures/snipeInterface";
import analytics from "../../db/models/analytics";

export default {
  name: "snipe",
  description: "Retrieves recently deleted or edited messages.",
  options: [
    {
      name: "type",
      description: "Whether to fetch the last deleted or last edited message",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "deleted", value: "delete" },
        { name: "edited", value: "edit" },
      ],
    },
    {
      name: "channel",
      description: "The channel to snipe messages from",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "user",
      description: "The user to snipe messages from",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
    {
      name: "amount",
      description: "The amount of messages to retrieve",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
  ],
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });

    const channelOption =
      interaction.options.getChannel("channel") || interaction.channel;
    if (!channelOption || !(channelOption instanceof TextChannel)) {
      await interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("Please provide a valid text channel.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return;
    }

    const user = interaction.options.getUser("user");

    const messageType = interaction.options.getString("type", true);
    const rawAmount = interaction.options.getInteger("amount");
    const amount = (!rawAmount ? 1 : rawAmount) < 0 ? null : rawAmount;

    const query = snipe
      .find({
        channelId: channelOption.id,
        authorId: user ? user.id : { $exists: true },
        guildId: interaction.guildId,
        methodType: messageType,
      })
      .sort({ timestamp: -1 });

    amount && query.limit(amount);

    const snipedMessages = await query;

    if (!snipedMessages.length) {
      await interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Snipe | No data")
              .setDescription("No sniped messages found with those parameters.")
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return;
    }

    const embeds: EmbedBuilder[] = [];

    for (let i = 0; i < Math.ceil(snipedMessages.length / 5); i++) {
      const embed = new EmbedBuilder()
        .setTitle(`Snipe`)
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now());

      const page = snipedMessages.slice(i * 5, i * 5 + 5);
      for (const snipedMessage of page) {
        const nuser = await interaction.client.users
          .fetch(snipedMessage.authorId)
          .catch(() => null);
        const relative = moment(snipedMessage.timestamp).fromNow();
        embed.addFields([
          {
            name: `${
              snipedMessage.methodType === "edit" ? "Edited" : "Deleted"
            } by ${nuser ? nuser.tag : snipedMessage.authorId} | ${relative}`,
            value: snipedMessage.content,
          },
        ]);
      }
      embeds.push(embed);
    }

    const backId = nanoid();
    const nextId = nanoid();
    const deleteId = nanoid();
    const reply = await interaction.editReply({
      embeds: [embeds[0]],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents([
          new ButtonBuilder()
            .setCustomId(backId)
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(nextId)
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(embeds.length === 1),
          new ButtonBuilder()
            .setCustomId(deleteId)
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger),
        ]),
      ],
      allowedMentions: {
        users: [],
      },
    });

    try {
      // Change the page when the user clicks a button for 5 minutes
      let page = 0;
      let expired = false;
      setTimeout(() => {
        reply
          .edit({
            components: [],
          })
          .catch(() => null);
        expired = true;
      }, 1000 * 60 * 5);
      while (!expired) {
        page = await changePage(
          reply,
          interaction.user,
          embeds,
          page,
          backId,
          nextId,
          deleteId,
          snipedMessages
        );
      }
    } catch (err) {
      return reply
        .edit({
          components: [],
        })
        .catch(() => null);
    }
  },
  message: async (interaction, { args }) => {
    args = args ?? [];
    const channelOption =
      interaction.mentions.channels.first() || interaction.channel;
    if (!channelOption || !(channelOption instanceof TextChannel)) {
      await interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("Please provide a valid text channel.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return;
    }

    const user = interaction.mentions.users.first();

    const messageType = args[0];
    if (!messageType || !["delete", "edit"].includes(messageType)) {
      await interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "Please provide a valid message type. Either `delete` or `edit`"
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
      return;
    }

    const rawAmount = parseInt(args.filter((arg) => !isNaN(Number(arg)))[0]);
    const amount = (!rawAmount ? 1 : rawAmount) < 0 ? null : rawAmount;

    const query = snipe
      .find({
        channelId: channelOption.id,
        authorId: user ? user.id : { $exists: true },
        guildId: interaction.guildId,
        methodType: messageType,
      })
      .sort({ timestamp: -1 });

    amount && query.limit(amount);

    const snipedMessages = await query;

    if (!snipedMessages.length) {
      await interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Snipe | No data")
              .setDescription("No sniped messages found with those parameters.")
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return;
    }

    const embeds: EmbedBuilder[] = [];

    for (let i = 0; i < Math.ceil(snipedMessages.length / 5); i++) {
      const embed = new EmbedBuilder()
        .setTitle(`Snipe`)
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.author.tag}`,
          iconURL: interaction.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now());

      const page = snipedMessages.slice(i * 5, i * 5 + 5);
      for (const snipedMessage of page) {
        const nuser = await interaction.client.users
          .fetch(snipedMessage.authorId)
          .catch(() => null);
        const relative = moment(snipedMessage.timestamp).fromNow();
        embed.addFields([
          {
            name: `${
              snipedMessage.methodType === "edit" ? "Edited" : "Deleted"
            } by ${nuser ? nuser.tag : snipedMessage.authorId} | ${relative}`,
            value: snipedMessage.content,
          },
        ]);
      }
      embeds.push(embed);
    }

    const backId = nanoid();
    const nextId = nanoid();
    const deleteId = nanoid();
    const reply = await interaction.reply({
      embeds: [embeds[0]],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents([
          new ButtonBuilder()
            .setCustomId(backId)
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(nextId)
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(embeds.length === 1),
          new ButtonBuilder()
            .setCustomId(deleteId)
            .setEmoji("🗑️")
            .setStyle(ButtonStyle.Danger),
        ]),
      ],
      allowedMentions: {
        users: [],
      },
    });

    try {
      // Change the page when the user clicks a button for 5 minutes
      let page = 0;
      let expired = false;
      setTimeout(() => {
        reply
          .edit({
            components: [],
          })
          .catch(() => null);
        expired = true;
      }, 1000 * 60 * 5);
      while (!expired) {
        page = await changePage(
          reply,
          interaction.author,
          embeds,
          page,
          backId,
          nextId,
          deleteId,
          snipedMessages
        );
      }
    } catch (err) {
      return reply
        .edit({
          components: [],
        })
        .catch(() => null);
    }
  },
} as Command;

async function changePage(
  msg: Message,
  user: User,
  embeds: EmbedBuilder[],
  page: number,
  backId: string,
  nextId: string,
  deleteId: string,
  snipes: HydratedDocument<snipeInterface>[]
) {
  const button = await msg
    .awaitMessageComponent({
      filter: (i) => i.user.id === user.id,
      componentType: ComponentType.Button,
      time: 1000 * 60 * 5,
    })
    .catch(() => null);
  if (!button) return page;
  if (button.customId === deleteId) {
    handleDelete(button, page, snipes);
    return page;
  }
  if (button.customId === backId) {
    page--;
  } else if (button.customId === nextId) {
    page++;
  }
  await button.deferUpdate();
  await button.editReply({
    embeds: [embeds[page]],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
          .setCustomId(backId)
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId(nextId)
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === embeds.length - 1),
        new ButtonBuilder()
          .setCustomId(deleteId)
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      ]),
    ],
    allowedMentions: {
      users: [],
    },
  });
  return page;
}

async function handleDelete(
  button: ButtonInteraction,
  page: number,
  snipes: HydratedDocument<snipeInterface>[]
) {
  await button.reply({
    embeds: [
      safeEmbed(
        new EmbedBuilder()
          .setTitle("Snipe | Deletion")
          .setDescription("Select the snipe you want to delete.")
          .setColor(EmbedColors.info),
        {
          withSystemMessages: false,
        }
      ),
    ],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
        new StringSelectMenuBuilder()
          .setCustomId(nanoid())
          .setPlaceholder("Select a snipe to delete")
          .addOptions(
            snipes.slice(page * 5, page * 5 + 5).map((snipe) => ({
              label: `Snipe by ${
                button.client.users.cache
                  .get(snipe.authorId)
                  ?.tag.slice(0, 80) ?? snipe.authorId
              } | ${moment(snipe.timestamp).fromNow()}`,
              value: snipe._id.toString(),
              description:
                snipe.content.length >= 50
                  ? snipe.content.slice(0, 47) + "..."
                  : snipe.content,
            }))
          ),
      ]),
    ],
    ephemeral: true,
  });
  const select = await button.channel
    ?.awaitMessageComponent({
      filter: (i) => i.user.id === button.user.id,
      componentType: ComponentType.StringSelect,
      time: 1000 * 60 * 5,
    })
    .catch(() => null);
  if (!select) return;
  await select.deferReply({
    ephemeral: true,
  });
  const snipeToDelete = await snipe.findOneAndDelete({
    _id: select.values[0],
  });
  if (!snipeToDelete)
    return select.editReply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("Failed to find the snipe to delete.")
            .setColor(EmbedColors.error),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });
  select.editReply({
    embeds: [
      safeEmbed(
        new EmbedBuilder()
          .setTitle("Snipe | Deletion")
          .setDescription("Successfully deleted the snipe.")
          .setFields([
            {
              name: "Content",
              value: snipeToDelete.content,
            },
            {
              name: "Author",
              value:
                button.client.users.cache
                  .get(snipeToDelete.authorId)
                  ?.tag.slice(0, 80) ?? snipeToDelete.authorId,
            },
            {
              name: "Timestamp",
              value: `<t:${Math.floor(
                snipeToDelete.timestamp!.getTime() / 1000
              )}:f>`,
            },
          ])
          .setColor(EmbedColors.success),
        {
          withSystemMessages: false,
        }
      ),
    ],
  });
  const an = new analytics({
    guildID: snipeToDelete.guildId,
    userID: button.user.id,
    action: "deleteSnipe",
    timestamp: new Date(),
    name: `deleteSnipe-${snipeToDelete.authorId}`,
    responseTime: Date.now() - select.createdTimestamp,
    type: "other"
  });
  await an.save();
}
