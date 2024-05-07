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
  PermissionsBitField,
  Channel,
  ButtonComponent,
  MessageEditOptions,
} from "discord.js";
import snipe from "../../db/models/snipe.js";
import safeEmbed from "../../utils/safeEmbed.js";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import type Command from "../../structures/commandInterface.js";
import { nanoid } from "nanoid";
import moment from "moment";
import { HydratedDocument } from "mongoose";
import snipeInterface from "../../structures/snipeInterface.js";
import analytics from "../../db/models/analytics.js";

export default {
  name: "snipe",
  description: "Retrieves recently deleted or edited messages.",
  options: [
    {
      name: "type",
      description: "Whether to fetch the last deleted or last edited message",
      type: ApplicationCommandOptionType.String,
      required: false,
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
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  aliases: ["esnipe"],
  syntax: "[channel] [user] [amount]",
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");
    const channelOption = channel || interaction.channel;
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

    const messageType = interaction.options.getString("type") ?? "delete";
    const rawAmount = interaction.options.getInteger("amount");
    const amount = (!rawAmount ? 1 : rawAmount) < 0 ? null : rawAmount;

    let { rawSnipedMessages, snipedMessages } = await getSnipes(
      user as User | undefined,
      channel as Channel | undefined,
      channelOption,
      interaction,
      messageType as "edit" | "delete",
      amount
    );

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

    let embeds: EmbedBuilder[] = [];

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
            value: snipedMessage.content.slice(0, 1024),
          },
        ]);
      }
      embeds.push(safeEmbed(embed));
    }

    const backId = nanoid();
    const nextId = nanoid();
    const deleteId = nanoid();
    const hiddenId = nanoid();
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
          new ButtonBuilder()
            .setCustomId(hiddenId)
            .setEmoji("👁️")
            .setStyle(ButtonStyle.Secondary),
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
          rawSnipedMessages,
          deleteId,
          hiddenId,
          interaction
        );

        const newSnipes = await getSnipes(
          user as User | undefined,
          channel as Channel | undefined,
          channelOption,
          interaction,
          messageType as "edit" | "delete",
          amount
        );
        embeds = await getPages(newSnipes.snipedMessages, interaction);
        rawSnipedMessages = newSnipes.rawSnipedMessages;
        snipedMessages = newSnipes.snipedMessages;
      }
    } catch (err) {
      return reply
        .edit({
          components: [],
        })
        .catch(() => null);
    }
  },
  message: async (interaction, { args, alias }) => {
    args = args ?? [];
    const channel = interaction.mentions.channels.first();
    const channelOption = channel || interaction.channel;
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

    const messageType = alias === "snipe" ? "delete" : "edit";

    const rawAmount = parseInt(args.filter((arg) => !isNaN(Number(arg)))[0]);
    const amount = (!rawAmount ? 1 : rawAmount) < 0 ? null : rawAmount;

    let { rawSnipedMessages, snipedMessages } = await getSnipes(
      user,
      channel,
      channelOption,
      interaction,
      messageType,
      amount
    );

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

    let embeds = await getPages(snipedMessages, interaction);

    const backId = nanoid();
    const nextId = nanoid();
    const deleteId = nanoid();
    const hiddenId = nanoid();
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
          new ButtonBuilder()
            .setCustomId(hiddenId)
            .setEmoji("👁️")
            .setStyle(ButtonStyle.Secondary),
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
          rawSnipedMessages,
          deleteId,
          hiddenId
        );

        const newSnipes = await getSnipes(
          user,
          channel,
          channelOption,
          interaction,
          messageType,
          amount
        );
        embeds = await getPages(newSnipes.snipedMessages, interaction);
        rawSnipedMessages = newSnipes.rawSnipedMessages;
        snipedMessages = newSnipes.snipedMessages;
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
  snipes: HydratedDocument<snipeInterface>[],
  deleteId?: string,
  hiddenId?: string,
  interaction?: ChatInputCommandInteraction
) {
  const button = await msg
    .awaitMessageComponent({
      filter: (i) => i.user.id === user.id,
      componentType: ComponentType.Button,
      time: 1000 * 60 * 5,
    })
    .catch(() => null);
  if (!button) return page;
  if (deleteId && button.customId === deleteId) {
    await handleDelete(button, page, snipes, interaction);
    return page;
  }
  if (hiddenId && button.customId === hiddenId) {
    handleHidden(button, snipes);
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
        ...(deleteId
          ? [
              new ButtonBuilder()
                .setCustomId(deleteId)
                .setEmoji("🗑️")
                .setStyle(ButtonStyle.Danger),
            ]
          : []),
        ...(hiddenId
          ? [
              new ButtonBuilder()
                .setCustomId(hiddenId)
                .setEmoji("👁️")
                .setStyle(ButtonStyle.Secondary),
            ]
          : []),
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
  snipes: HydratedDocument<snipeInterface>[],
  interaction?: ChatInputCommandInteraction
) {
  const newSnipes = snipes.filter((snipe) => !snipe.hidden);
  await button.reply({
    embeds: [
      safeEmbed(
        new EmbedBuilder()
          .setTitle("Snipe | Hide")
          .setDescription("Select the snipe you want to hide.")
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
          .setPlaceholder("Select a snipe to hide")
          .addOptions(
            newSnipes.slice(page * 5, page * 5 + 5).map((snipe) => ({
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
  const snipeToDelete = await snipe.findOneAndUpdate(
    {
      _id: select.values[0],
    },
    {
      hidden: true,
    }
  );
  if (!snipeToDelete) {
    select.editReply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("Failed to find the snipe to hide.")
            .setColor(EmbedColors.error),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });
    return;
  }
  button.editReply({
    components: [],
  });

  const newPages = await getPages(
    newSnipes.filter(
      (snipe) => snipe._id.toString() !== snipeToDelete._id.toString()
    ),
    button
  );
  const oldComponents = interaction
    ? (await interaction.fetchReply()).components[0].components
    : button.message.components[0].components;
  const newContent: MessageEditOptions = {
    embeds: [newPages[page]],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        oldComponents.map((component, i) => {
          const b = new ButtonBuilder((component as ButtonComponent).toJSON());
          if (i === 0) b.setDisabled(page === 0);
          if (i === 1) b.setDisabled(page === newPages.length - 1);
          return b;
        })
      ),
    ],
  };
  interaction
    ? await interaction.editReply(newContent)
    : await button.message.edit(newContent);

  select.editReply({
    embeds: [
      safeEmbed(
        new EmbedBuilder()
          .setTitle("Snipe | Hide")
          .setDescription(
            'Successfully hid the snipe. It will now be hidden to the "👁️" section.'
          )
          .setFields([
            {
              name: "Content",
              value: snipeToDelete.content.slice(0, 1024),
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
    type: "other",
  });
  await an.save();
  return snipeToDelete;
}

async function handleHidden(
  button: ButtonInteraction,
  snipes: HydratedDocument<snipeInterface>[]
) {
  await button.deferReply({
    ephemeral: true,
  });
  const embeds: EmbedBuilder[] = [];

  snipes = snipes.filter((snipe) => snipe.hidden);

  if (!snipes.length) {
    return button.editReply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Snipe | Hidden")
            .setDescription("No hidden snipes found.")
            .setColor(EmbedColors.info),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });
  }

  for (let i = 0; i < Math.ceil(snipes.length / 5); i++) {
    const embed = new EmbedBuilder()
      .setTitle(`Snipe | Hidden`)
      .setDescription("Showing hidden snipes.")
      .setColor(EmbedColors.info)
      .setFooter({
        text: `Requested by ${button.user.tag}`,
        iconURL: button.user.displayAvatarURL(),
      })
      .setTimestamp(Date.now());

    const page = snipes.slice(i * 5, i * 5 + 5);
    for (const snipedMessage of page) {
      const nuser = await button.client.users
        .fetch(snipedMessage.authorId)
        .catch(() => null);
      const relative = moment(snipedMessage.timestamp).fromNow();
      embed.addFields([
        {
          name: `${
            snipedMessage.methodType === "edit" ? "Edited" : "Deleted"
          } by ${nuser ? nuser.tag : snipedMessage.authorId} | ${relative}`,
          value: snipedMessage.content.slice(0, 1024),
        },
      ]);
    }
    embeds.push(safeEmbed(embed));
  }

  const backId = nanoid();
  const nextId = nanoid();
  const reply = await button.editReply({
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
        button.user,
        embeds,
        page,
        backId,
        nextId,
        snipes
      );
    }
  } catch (err) {
    console.error(err);
    return reply
      .edit({
        components: [],
      })
      .catch(() => null);
  }
}

async function getPages(
  snipedMessages: HydratedDocument<snipeInterface>[],
  interaction: Message | ButtonInteraction | ChatInputCommandInteraction
) {
  const embeds: EmbedBuilder[] = [];

  for (let i = 0; i < Math.ceil(snipedMessages.length / 5); i++) {
    const embed = new EmbedBuilder()
      .setTitle(`Snipe`)
      .setColor(EmbedColors.info)
      .setFooter({
        text: `Requested by ${
          (interaction instanceof Message
            ? interaction.author
            : interaction.user
          ).tag
        }`,
        iconURL: (interaction instanceof Message
          ? interaction.author
          : interaction.user
        ).displayAvatarURL(),
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
          value: snipedMessage.content.slice(0, 1024),
        },
      ]);
    }
    embeds.push(safeEmbed(embed));
  }

  return embeds;
}

async function getSnipes(
  user: User | undefined,
  channel: Channel | undefined,
  channelOption: TextChannel,
  interaction: Message | ButtonInteraction | ChatInputCommandInteraction,
  messageType: "edit" | "delete",
  amount: number | null
) {
  const query = snipe
    .find({
      channelId: user && !channel ? { $exists: true } : channelOption.id,
      authorId: user ? user.id : { $exists: true },
      guildId: interaction.guildId,
      methodType: messageType,
    })
    .sort({ timestamp: -1 });

  amount && query.limit(amount);

  const rawSnipedMessages = await query;
  const snipedMessages = rawSnipedMessages.filter((snipe) => !snipe.hidden);
  return {
    snipedMessages,
    rawSnipedMessages,
  };
}
