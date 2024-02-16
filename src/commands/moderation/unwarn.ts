import type {
  ChatInputCommandInteraction,
  GuildMemberRoleManager /* ContextMenuCommandInteraction, Message */,
  Message,
  User,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import {
  GuildMember,
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import unwarnMember from "../../helpers/unwarnMember";
import { HydratedDocument } from "mongoose";
import warnInterface from "../../structures/warnInterface";
import { Warn } from "../../db";
import { nanoid } from "nanoid";
import ms from "ms";
import configs from "../../config";

export default {
  name: "unwarn",
  description: "Removes a warning from a user.",
  options: [
    {
      name: "user",
      description: "The user to remove a warn from.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the unwarn.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  aliases: ["uw"],
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
    const reason = interaction.options.getString("reason");
    const member = interaction.guild!.members.cache.get(user.id) as GuildMember;

    const config = configs.get(interaction.guildId!)!;

    if (!member) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMemberNotFound)
            .setDescription(`<@${user.id}> is not a member of this server.`)
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
    if (member.id === interaction.user.id) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorSelf)
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
    if (member.id === interaction.client.user.id) {
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
    if (
      member.roles.highest.position >=
      (interaction.member?.roles as GuildMemberRoleManager).highest.position
    ) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorAuthority)
            .setDescription(
              `<@${member.id}>'s highest role is <@&${
                member.roles.highest.id
              }> (Position: ${
                member.roles.highest.position
              }), which is higher or equal to your highest role. (Position: ${
                (interaction.member?.roles as GuildMemberRoleManager).highest
                  .position
              })`,
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        allowedMentions: {
          users: [],
        },
        ephemeral: true,
      });
    }

    if (
      member.roles.highest.position >=
      (interaction.guild!.members.me?.roles as GuildMemberRoleManager).highest
        .position
    ) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorBotAuthority)
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
      userID: member.id,
      guildID: interaction.guild!.id,
      expiresAt: { $gte: new Date().getTime() },
      unwarn: { $exists: false },
    }).sort({ timestamp: -1 });
    if (warns.length === 0) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(`<@${member.id}> has no active warns.`)
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
    const id = nanoid();
    const idInteraction = await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setTitle("Unwarn")
          .setDescription("Select a warning to remove.")
          .setColor(EmbedColors.info)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(
              "Select a warning. (In order from newest to oldest)",
            )
            .addOptions(
              warns.map((warn, index) => {
                return {
                  label: `Warn ${index + 1}`,
                  value: warn._id.toString(),
                  description: `@${
                    interaction.client.users.cache
                      .get(warn.moderatorID)
                      ?.tag.substring(0, 20) || "someone"
                  } - "${warn.reason.substring(0, 40)}" - ${
                    warn.severity === 1 ? "Light" : "Heavy"
                  } - ${ms(warn.expiresAt.getTime() - Date.now())} left.`,
                };
              }),
            ),
        ),
      ],
      ephemeral: true,
    });
    try {
      const component = await idInteraction.awaitMessageComponent({
        time: 60000,
        filter: (i) => i.customId === id && i.user.id === interaction.user.id,
        componentType: ComponentType.StringSelect,
      });
      const warn = warns.find(
        (warn) => warn._id.toString() === component.values[0],
      );

      if (!warn) {
        return component.update({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("The warning you selected was not found.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          components: [],
        });
      }

      const unwarn = await unwarnMember(
        warn,
        interaction.member! as GuildMember,
        reason!,
      );
      if (!unwarn) {
        return component.update({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("The warning you selected was not found.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          components: [],
        });
      }
      const embed = new EmbedBuilder()
        .setTitle("Unwarned")
        .setDescription(
          `Removed a warning from <@${member.id}> for ${
            reason || "No reason provided"
          }.`,
        )
        .setFields([
          {
            name: "Reason",
            value: reason || "No reason provided",
          },
          {
            name: "Warn Info",
            value: `
                    **Moderator**: <@${unwarn.moderatorID}>
                    **Severity**: ${unwarn.severity === 1 ? "Light" : "Heavy"}
                    **Expires At**: <t:${Math.floor(
                      unwarn.expiresAt.getTime() / 1000,
                    )}:f>
                    **Mute Expires At**: ${
                      unwarn.withMute
                        ? `<t:${Math.floor(
                            unwarn.withMute.getTime() / 1000,
                          )}:f>`
                        : "Not muted"
                    }
                    `,
          },
        ])
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now());
      interaction.editReply({
        components: [],
      });
      if (interaction.channel !== config.logChannel)
        config.log({
          embeds: [embed],
          allowedMentions: { users: [member.id] },
        });
      return component.reply({
        embeds: [embed],
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Unwarn")
            .setDescription("You took too long to respond.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        components: [],
      });
    }
  },
  message: async (interaction: Message, { args }) => {
    const config = configs.get(interaction.guildId!)!;
    args = args ?? [];
    const rawUser = args[0];
    let user: User;
    try {
      user = await interaction.client.users.fetch(
        rawUser.replace(/[<@!>]/g, ""),
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
    let reason: string | undefined = args.slice(1).join(" ");
    if (!reason) reason = undefined;
    const member = interaction.guild!.members.cache.get(user.id) as GuildMember;

    if (!member) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorMemberNotFound)
            .setDescription(`<@${user.id}> is not a member of this server.`)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    if (member.id === interaction.author.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorSelf)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    if (member.id === interaction.client.user.id) {
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
    if (
      member.roles.highest.position >=
      (interaction.member?.roles as GuildMemberRoleManager).highest.position
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorAuthority)
            .setDescription(
              `<@${member.id}>'s highest role is <@&${
                member.roles.highest.id
              }> (Position: ${
                member.roles.highest.position
              }), which is higher or equal to your highest role. (Position: ${
                (interaction.member?.roles as GuildMemberRoleManager).highest
                  .position
              })`,
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        allowedMentions: {
          users: [],
        },
      });
    }

    if (
      member.roles.highest.position >=
      (interaction.guild!.members.me?.roles as GuildMemberRoleManager).highest
        .position
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorBotAuthority)
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
      userID: member.id,
      guildID: interaction.guild!.id,
      expiresAt: { $gte: new Date().getTime() },
      unwarn: { $exists: false },
    }).sort({ timestamp: -1 });
    if (warns.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(`<@${member.id}> has no active warns.`)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    const id = nanoid();
    const idInteraction = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Unwarn")
          .setDescription("Select a warning to remove.")
          .setColor(EmbedColors.info)
          .setFooter({
            text: `Requested by ${interaction.author.tag}`,
            iconURL: interaction.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(
              "Select a warning. (In order from newest to oldest)",
            )
            .addOptions(
              warns.map((warn, index) => {
                return {
                  label: `Warn ${index + 1}`,
                  value: warn._id.toString(),
                  description: `@${
                    interaction.client.users.cache
                      .get(warn.moderatorID)
                      ?.tag.substring(0, 20) || "someone"
                  } - "${warn.reason.substring(0, 40)}" - ${
                    warn.severity === 1 ? "Light" : "Heavy"
                  } - ${ms(warn.expiresAt.getTime() - Date.now())} left.`,
                };
              }),
            ),
        ),
      ],
    });
    try {
      const component = await idInteraction.awaitMessageComponent({
        time: 60000,
        filter: (i) => i.customId === id && i.user.id === interaction.author.id,
        componentType: ComponentType.StringSelect,
      });
      const warn = warns.find(
        (warn) => warn._id.toString() === component.values[0],
      );

      if (!warn) {
        return component.update({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("The warning you selected was not found.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          components: [],
        });
      }

      const unwarn = await unwarnMember(
        warn,
        interaction.member! as GuildMember,
        reason!,
      );
      if (!unwarn) {
        return component.update({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("The warning you selected was not found.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
          components: [],
        });
      }
      const embed = new EmbedBuilder()
        .setTitle("Unwarned")
        .setDescription(
          `Removed a warning from <@${member.id}> for ${
            reason || "No reason provided"
          }.`,
        )
        .setFields([
          {
            name: "Reason",
            value: reason || "No reason provided",
          },
          {
            name: "Warn Info",
            value: `
                        **Moderator**: <@${unwarn.moderatorID}>
                        **Severity**: ${
                          unwarn.severity === 1 ? "Light" : "Heavy"
                        }
                        **Expires At**: <t:${Math.floor(
                          unwarn.expiresAt.getTime() / 1000,
                        )}:f>
                        **Mute Expires At**: ${
                          unwarn.withMute
                            ? `<t:${Math.floor(
                                unwarn.withMute.getTime() / 1000,
                              )}:f>`
                            : "Not muted"
                        }
                        `,
          },
        ])
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.author.tag}`,
          iconURL: interaction.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now());
      idInteraction.edit({
        components: [],
      });
      if (interaction.channel !== config.logChannel)
        config.log({
          embeds: [embed],
          allowedMentions: { users: [member.id] },
        });
      return component.reply({
        embeds: [embed],
      });
    } catch (err) {
      return interaction.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("Unwarn")
            .setDescription("You took too long to respond.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        components: [],
      });
    }
  },
} as Command;
