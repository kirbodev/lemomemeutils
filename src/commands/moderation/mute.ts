import type {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  Message,
  User /* ContextMenuCommandInteraction, Message */,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import {
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
} from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import logger from "../../helpers/logger";
import configs from "../../config";
import muteMember from "../../helpers/muteMember";
import ms from "ms";
import { Action } from "../../db";

export default {
  name: "mute",
  description: "Mute a user.",
  options: [
    {
      name: "user",
      description: "The user to mute.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "time",
      description:
        "The amount of time to mute the user for. Format: `1d 2h 3m 4s`",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for muting the user.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  contextName: "Mute user",
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
    const reason = interaction.options.getString("reason");
    const config = configs.get(interaction.guildId!)!;
    const time = interaction.options.getString("time");

    const timeMs = time ? ms(time) : undefined;

    const member = interaction.guild!.members.cache.get(user.id);

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
      });
    }
    if (!time || !timeMs || timeMs < 0 || timeMs > 3.1536e10 /* 1 year */) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorInvalidTime)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    if (user.id === interaction.user.id) {
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
      });
    }
    if (user.id === interaction.client.user.id) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorBot)
            .setDescription("What have I done wrong? :(")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
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
    if (!member.manageable) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(`<@${member.id}> is not muteable.`)
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
      member.communicationDisabledUntilTimestamp &&
      member.communicationDisabledUntilTimestamp > Date.now()
    ) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUserMuted)
            .setDescription(
              `<@${member.id}> is already muted. Unmute them first.`,
            )
            .setFields([
              {
                name: "Expires At",
                value: `<t:${Math.floor(
                  member.communicationDisabledUntilTimestamp / 1000,
                )}:f>`,
              },
            ])
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        ephemeral: true,
      });
    }

    try {
      const mute = await muteMember(
        member,
        new Date(Date.now() + timeMs),
        reason || "No reason provided",
      );
      if (!mute) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("Something went wrong while muting the user.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
        });
      }
      // muteMember doesn't save to DB or send DMs bc it's used by other commands
      let dmSent = false;
      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("You have been muted")
              .setDescription(
                `You have been muted in \`${interaction.guild!.name}\``,
              )
              .setFields([
                {
                  name: "Reason",
                  value: reason || "No reason provided",
                },
                {
                  name: "Moderator",
                  value: interaction.user.tag,
                },
                {
                  name: "Expires At",
                  value: `<t:${Math.floor(mute.getTime() / 1000)}:f>`,
                },
                {
                  name: "Appeal",
                  value:
                    "You can appeal by joining the appeal server. https://discord.gg/EUsVK5E",
                },
              ])
              .setColor(EmbedColors.warning)
              .setFooter({
                text: `Muted by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
        });
        dmSent = true;
      } catch (e) {
        // Do nothing
      }
      const action = new Action({
        actionType: "mute",
        guildID: interaction.guildId!,
        moderatorID: interaction.user.id,
        userID: user.id,
        reason: reason,
        expiresAt: new Date(Date.now() + timeMs),
      });
      await action.save();
      const embed = new EmbedBuilder()
        .setTitle("Muted")
        .setDescription(
          `Muted <@${user.id}> for \`${reason || "No reason provided"}\`. ${
            dmSent ? "They have been notified." : "They could not be notified."
          }`,
        )
        .setFields([
          {
            name: "Expires",
            value: `<t:${Math.floor(mute.getTime() / 1000)}:f>`,
          },
        ])
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now());
      if (interaction.channel !== config.logChannel)
        config.log({ embeds: [embed] });
      return interaction.followUp({
        embeds: [embed],
      });
    } catch (e) {
      logger.warn(`Mute command failed to mute user. ${e}`);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorGeneric)
            .setDescription("Something went wrong while muting the user.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
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
    const time = args[1];
    const timeMs = time ? ms(time) : undefined;

    let reason: string | undefined = args.slice(2).join(" ");
    if (!reason) reason = undefined;

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
    if (!time || !timeMs || timeMs < 0 || timeMs > 3.1536e10 /* 1 year */) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorInvalidTime)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
    if (user.id === interaction.author.id) {
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
    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorBot)
            .setDescription("What have I done wrong? :(")
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
    if (!member.manageable) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(`<@${member.id}> is not muteable.`)
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
      member.communicationDisabledUntilTimestamp &&
      member.communicationDisabledUntilTimestamp > Date.now()
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUserMuted)
            .setDescription(
              `<@${member.id}> is already muted. Unmute them first.`,
            )
            .setFields([
              {
                name: "Expires At",
                value: `<t:${Math.floor(
                  member.communicationDisabledUntilTimestamp / 1000,
                )}:f>`,
              },
            ])
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }

    try {
      const mute = await muteMember(
        member,
        new Date(Date.now() + timeMs),
        reason || "No reason provided",
      );
      if (!mute) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("Something went wrong while muting the user.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
        });
      }
      // muteMember doesn't save to DB or send DMs bc it's used by other commands
      let dmSent = false;
      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("You have been muted")
              .setDescription(
                `You have been muted in \`${interaction.guild!.name}\``,
              )
              .setFields([
                {
                  name: "Reason",
                  value: reason || "No reason provided",
                },
                {
                  name: "Moderator",
                  value: interaction.author.tag,
                },
                {
                  name: "Expires At",
                  value: `<t:${Math.floor(mute.getTime() / 1000)}:f>`,
                },
                {
                  name: "Appeal",
                  value:
                    "You can appeal by joining the appeal server. https://discord.gg/EUsVK5E",
                },
              ])
              .setColor(EmbedColors.warning)
              .setFooter({
                text: `Muted by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now()),
          ],
        });
        dmSent = true;
      } catch (e) {
        // Do nothing
      }
      const action = new Action({
        actionType: "mute",
        guildID: interaction.guildId!,
        moderatorID: interaction.author.id,
        userID: user.id,
        reason: reason,
        expiresAt: new Date(Date.now() + timeMs),
      });
      await action.save();
      const embed = new EmbedBuilder()
        .setTitle("Muted")
        .setDescription(
          `Muted <@${user.id}> for \`${reason || "No reason provided"}\`. ${
            dmSent ? "They have been notified." : "They could not be notified."
          }`,
        )
        .setFields([
          {
            name: "Expires",
            value: `<t:${Math.floor(mute.getTime() / 1000)}:f>`,
          },
        ])
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.author.tag}`,
          iconURL: interaction.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now());
      if (interaction.channel !== config.logChannel)
        config.log({ embeds: [embed] });
      return interaction.reply({
        embeds: [embed],
      });
    } catch (e) {
      logger.warn(`Mute command failed to mute user. ${e}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorGeneric)
            .setDescription("Something went wrong while muting the user.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }
  },
} as Command;
