import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  User,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import configs from "../../config";
import { Action, Warn } from "../../db";
import { HydratedDocument } from "mongoose";
import warnInterface, { unwarnInterface } from "../../structures/warnInterface";
import actionInterface from "../../structures/actionInterface";
import ms from "ms";
import { nanoid } from "nanoid";

export default {
  name: "caselogs",
  description: "Shows the moderation history of a user.",
  options: [
    {
      name: "user",
      description:
        "The user to show the moderation history of. (Moderator only)",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  contextName: "Case logs",
  permissionsRequired: [PermissionsBitField.Flags.SendMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    let user = interaction.options.getUser("user");

    if (
      user &&
      !interaction.memberPermissions?.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorPermissions)
            .setDescription(
              "You must be a moderator to view the case logs of another user."
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
    if (!user) user = interaction.user;
    const member = interaction.guild!.members.cache.get(user.id);

    const config = configs.get(interaction.guildId!)!;

    if (!user) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUserNotFound)
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
    if (!member) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMemberNotFound)
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
    if (user.id === interaction.client.user.id) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorBot)
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

    const warns: HydratedDocument<warnInterface>[] = await Warn.find({
      guildID: interaction.guildId,
      userID: user.id,
    }).sort({ timestamp: -1 });
    const actions: HydratedDocument<actionInterface>[] = await Action.find({
      guildID: interaction.guildId,
      userID: user.id,
    }).sort({ timestamp: -1 });
    // Get the unwarn value of all warns with an unwarn value
    const unwarns = warns.filter((warn) => warn.unwarn);

    interface CombinedInterface
      extends Partial<warnInterface>,
        Partial<actionInterface>,
        Partial<unwarnInterface> {}
    const combined: HydratedDocument<CombinedInterface>[] = [
      ...warns,
      ...actions,
      ...unwarns,
    ].sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());

    if (combined.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Case logs | No cases found")
            .setDescription(`${user} has no cases.`)
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }

    const embeds = [];
    // Make a new embed for every 5 warns/actions
    for (let i = 0; i < Math.ceil(combined.length / 5); i++) {
      const embed = new EmbedBuilder()
        .setTitle(`Case logs | ${user.tag}`)
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now());

      if (i === 0) {
        embed.setDescription(
          `${user} has received ${warns.length} warn(s), ${
            actions.filter((action) => action.actionType === "mute").length +
            warns.filter((warn) => warn.withMute).length
          } mute(s), ${
            actions.filter((action) => action.actionType === "ban").length
          } ban(s), and ${
            actions.filter((action) => action.actionType === "kick").length
          } kick(s).\nPage ${i + 1}/${Math.ceil(combined.length / 5)}`
        );
      } else {
        embed.setDescription(`Page ${i + 1}/${Math.ceil(combined.length / 5)}`);
      }
      // Get the warns/actions for this page
      const page = combined.slice(i * 5, i * 5 + 5);
      // Add the warns/actions to the embed
      for (const action of page) {
        if (action.actionType) {
          embed.addFields([
            {
              name:
                action.actionType.charAt(0).toUpperCase() +
                action.actionType.slice(1),
              value: [
                `**Moderator**: <@${action.moderatorID}>`,
                action.expiresAt
                  ? `**Expires At**: <t:${Math.floor(
                      action.expiresAt.getTime() / 1000
                    )}:f>`
                  : undefined,
                action.withParole ? `**Parole**: Yes` : undefined,
                action.iceSeverity
                  ? `**Ice Severity**: <@&${
                      action.iceSeverity === 0
                        ? config.thinIceRoleID
                        : config.thinnerIceRoleID
                    }>`
                  : undefined,
                `**Reason**: ${action.reason || "No reason provided"}`,
                `**Timestamp**: <t:${Math.floor(
                  action.timestamp!.getTime() / 1000
                )}:f>`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ]);
        } else if (action.severity) {
          embed.addFields([
            {
              name: `Warn`,
              value: [
                `**Moderator**: <@${action.moderatorID}>`,
                `**Severity**: ${action.severity === 1 ? "Light" : "Heavy"}`,
                `**Mute time**: ${
                  action.withMute
                    ? ms(
                        action.withMute.getTime() - action.timestamp!.getTime()
                      )
                    : "N/A"
                }`,
                `**Reason**: ${action.reason || "No reason provided"}`,
                `**Timestamp**: <t:${Math.floor(
                  action.timestamp!.getTime() / 1000
                )}:f>`,
              ].join("\n"),
            },
          ]);
        } else {
          embed.addFields([
            {
              name: `Unwarn`,
              value: [
                `**Moderator**: <@${action.moderatorID}>`,
                `**Reason**: ${action.reason || "No reason provided"}`,
                `**Timestamp**: <t:${Math.floor(
                  action.timestamp!.getTime() / 1000
                )}:f>`,
              ].join("\n"),
            },
          ]);
        }
      }

      embeds.push(embed);
    }

    const backId = nanoid();
    const nextId = nanoid();
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
        interaction.editReply({
          components: [],
        });
        expired = true;
      }, 1000 * 60 * 5);
      while (!expired) {
        page = await changePage(
          reply,
          interaction.user,
          embeds,
          page,
          backId,
          nextId
        );
      }
    } catch (err) {
      return interaction.editReply({
        components: [],
      });
    }
  },
  message: async (interaction: Message, { args }) => {
    const config = configs.get(interaction.guildId!)!;
    args = args ?? [];
    const rawUser = args[0];
    let user: User;
    if (!rawUser) {
      user = interaction.author;
    } else {
      if (
        !interaction.member?.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorPermissions)
              .setDescription(
                "You must be a moderator to view the case logs of another user."
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
      try {
        user = await interaction.client.users.fetch(
          rawUser.replace(/[<@!>]/g, "")
        );
      } catch (e) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotFound)
              .setDescription("Please provide a valid user.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
        });
      }
    }
    const member = interaction.guild!.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMemberNotFound)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorBot)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }

    const warns: HydratedDocument<warnInterface>[] = await Warn.find({
      guildID: interaction.guildId,
      userID: user.id,
    }).sort({ timestamp: -1 });
    const actions: HydratedDocument<actionInterface>[] = await Action.find({
      guildID: interaction.guildId,
      userID: user.id,
    }).sort({ timestamp: -1 });
    // Get the unwarn value of all warns with an unwarn value
    const unwarns = warns.filter((warn) => warn.unwarn);

    interface CombinedInterface
      extends Partial<warnInterface>,
        Partial<actionInterface>,
        Partial<unwarnInterface> {}
    const combined: HydratedDocument<CombinedInterface>[] = [
      ...warns,
      ...actions,
      ...unwarns,
    ].sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());

    if (combined.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Case logs | No cases found")
            .setDescription(`${user} has no cases.`)
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }

    const embeds = [];
    // Make a new embed for every 5 warns/actions
    for (let i = 0; i < Math.ceil(combined.length / 5); i++) {
      const embed = new EmbedBuilder()
        .setTitle(`Case logs | ${user.tag}`)
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.author.tag}`,
          iconURL: interaction.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now());

      if (i === 0) {
        embed.setDescription(
          `${user} has received ${warns.length} warn(s), ${
            actions.filter((action) => action.actionType === "mute").length +
            warns.filter((warn) => warn.withMute).length
          } mute(s), ${
            actions.filter((action) => action.actionType === "ban").length
          } ban(s), and ${
            actions.filter((action) => action.actionType === "kick").length
          } kick(s).\nPage ${i + 1}/${Math.ceil(combined.length / 5)}`
        );
      } else {
        embed.setDescription(`Page ${i + 1}/${Math.ceil(combined.length / 5)}`);
      }
      // Get the warns/actions for this page
      const page = combined.slice(i * 5, i * 5 + 5);
      // Add the warns/actions to the embed
      for (const action of page) {
        if (action.actionType) {
          embed.addFields([
            {
              name:
                action.actionType.charAt(0).toUpperCase() +
                action.actionType.slice(1),
              value: [
                `**Moderator**: <@${action.moderatorID}>`,
                action.expiresAt
                  ? `**Expires At**: <t:${Math.floor(
                      action.expiresAt.getTime() / 1000
                    )}:f>`
                  : undefined,
                action.withParole ? `**Parole**: Yes` : undefined,
                action.iceSeverity
                  ? `**Ice Severity**: <@&${
                      action.iceSeverity === 0
                        ? config.thinIceRoleID
                        : config.thinnerIceRoleID
                    }>`
                  : undefined,
                `**Reason**: ${action.reason || "No reason provided"}`,
                `**Timestamp**: <t:${Math.floor(
                  action.timestamp!.getTime() / 1000
                )}:f>`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ]);
        } else if (action.severity) {
          embed.addFields([
            {
              name: `Warn`,
              value: [
                `**Moderator**: <@${action.moderatorID}>`,
                `**Severity**: ${action.severity === 1 ? "Light" : "Heavy"}`,
                `**Mute time**: ${
                  action.withMute
                    ? ms(
                        action.withMute.getTime() - action.timestamp!.getTime()
                      )
                    : "N/A"
                }`,
                `**Reason**: ${action.reason || "No reason provided"}`,
                `**Timestamp**: <t:${Math.floor(
                  action.timestamp!.getTime() / 1000
                )}:f>`,
              ].join("\n"),
            },
          ]);
        } else {
          embed.addFields([
            {
              name: `Unwarn`,
              value: [
                `**Moderator**: <@${action.moderatorID}>`,
                `**Reason**: ${action.reason || "No reason provided"}`,
                `**Timestamp**: <t:${Math.floor(
                  action.timestamp!.getTime() / 1000
                )}:f>`,
              ].join("\n"),
            },
          ]);
        }
      }

      embeds.push(embed);
    }

    const backId = nanoid();
    const nextId = nanoid();
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
        reply.edit({
          components: [],
        });
        expired = true;
      }, 1000 * 60 * 5);
      while (!expired) {
        page = await changePage(
          reply,
          interaction.author,
          embeds,
          page,
          backId,
          nextId
        );
      }
    } catch (err) {
      return reply.edit({
        components: [],
      });
    }
  },
} as Command;

async function changePage(
  msg: Message,
  user: User,
  embeds: EmbedBuilder[],
  page: number,
  backId: string,
  nextId: string
) {
  const button = await msg.awaitMessageComponent({
    filter: (i) => i.user.id === user.id,
    componentType: ComponentType.Button,
    time: 1000 * 60 * 5,
  });
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
      ]),
    ],
    allowedMentions: {
      users: [],
    },
  });
  return page;
}
