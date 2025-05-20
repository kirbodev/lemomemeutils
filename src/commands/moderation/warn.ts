import type {
  ChatInputCommandInteraction,
  GuildMemberRoleManager /* ContextMenuCommandInteraction, Message */,
  Message,
  User,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import {
  GuildMember,
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} from "discord.js";
import EmbedColors from "../../structures/embedColors.js";
import Errors from "../../structures/errors.js";
import warnMember, { WarnResponse } from "../../helpers/warnMember.js";
import getBanButton from "../../helpers/handleBanButton.js";
import ms from "ms";
import configs from "../../config.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "warn",
  description: "Warn a user.",
  options: [
    {
      name: "user",
      description: "The user to warn.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "mute",
      description: "The amount of time to mute the user for.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "reason",
      description: "Reason for the warning.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  aliases: ["w", "wm"],
  syntax: "prefixw <user> [reason] || prefixwm <user> <mute> [reason]",
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  contextName: "Warn user",
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
    const reason = interaction.options.getString("reason");
    const time = interaction.options.getString("mute");
    const timeMs = time ? ms(time) : undefined;
    const member = interaction.guild!.members.cache.get(user.id) as GuildMember;

    const force = interaction.memberPermissions?.has(
      PermissionsBitField.Flags.Administrator
    );

    const config = configs.get(interaction.guildId!)!;

    if (!member) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
              .setDescription(`<@${user.id}> is not a member of this server.`)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }
    if (member.id === interaction.client.user.id) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBot)
              .setDescription("What have I done wrong? :(")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }
    if (time && (!timeMs || timeMs < 0 || timeMs > 3.1536e10) /* 1 year */) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorInvalidTime)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }
    if (
      member.roles.highest.position >=
        (interaction.member?.roles as GuildMemberRoleManager).highest
          .position &&
      !force && member.id !== interaction.user.id
    ) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
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
                })`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        allowedMentions: {
          users: [],
        },
        ephemeral: true,
      });
    }

    if (
      time &&
      member.communicationDisabledUntilTimestamp &&
      member.communicationDisabledUntilTimestamp > Date.now()
    ) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserMuted)
              .setDescription(
                `<@${member.id}> is already muted. Unmute them first.`
              )
              .setFields([
                {
                  name: "Expires At",
                  value: `<t:${Math.floor(
                    member.communicationDisabledUntilTimestamp / 1000
                  )}:f>`,
                },
              ])
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }

    const warn = await warnMember(
      member,
      interaction.member as GuildMember,
      1,
      reason || undefined,
      timeMs ? new Date(Date.now() + timeMs) : undefined
    );

    if (warn.response === WarnResponse.RateLimited) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorCooldown)
              .setDescription(
                "To prevent accidentally warning a user multiple times, there is a 10 second cooldown between warnings of the same user."
              )
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }

    if (warn.response === WarnResponse.isAtMaxWarns) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "This user has already reached the maximum amount of warns. Please ban them instead."
              )
              .setFields([
                {
                  name: "Active warnings",
                  value: warn.warns
                    .map(
                      (warn) =>
                        `<t:${Math.floor(
                          warn.timestamp.getTime() / 1000
                        )}:f> - ${warn.reason} - ${
                          warn.severity === 1 ? "Light" : "Heavy"
                        } - Issued by <@${warn.moderatorID}>`
                    )
                    .join("\n"),
                },
              ])
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            getBanButton(member.user, "Reached the maximum amount of warns.")
          ),
        ],
        allowedMentions: {
          users: [],
        },
      });
    }

    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Warned")
        .setDescription(
          `Warned <@${member.id}> for \`${reason || "No reason provided"}\`. ${
            warn.dmSent
              ? "They have been notified."
              : "They could not be notified."
          }`
        )
        .setFields([
          {
            name: "Severity",
            value: `Light`,
          },
          {
            name: "Mute expires",
            value: warn.muteExpires
              ? `<t:${Math.floor(warn.muteExpires.getTime() / 1000)}:f>`
              : "Not muted",
          },
          {
            name: "Reason",
            value: reason || "No reason provided",
          },
        ])
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now())
    );

    const warns = warn.warns;
    if (warns.length > 0) {
      embed.addFields([
        {
          name: "Active warnings",
          value:
            warns
              .map(
                (warn) =>
                  `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${
                    warn.reason
                  } - ${
                    warn.severity === 1 ? "Light" : "Heavy"
                  } - Issued by <@${warn.moderatorID}>`
              )
              .join("\n") || "No active warnings.",
        },
      ]);
    }
    if (warn.response !== WarnResponse.Success) {
      embed.addFields([
        {
          name: "Ban warning",
          value: `Reason: \`${
            warn.response === WarnResponse.reachedMaxWarns
              ? "Reached the maximum amount of warns."
              : "Warned on parole."
          }\`. This user should be banned, they have been muted for 24 hours in the meanwhile.`,
        },
      ]);
      embed.setColor(EmbedColors.warning);
    }
    await interaction.followUp({
      embeds: [embed],
      components:
        warn.response !== WarnResponse.Success
          ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                getBanButton(
                  member.user,
                  warn.response === WarnResponse.reachedMaxWarns
                    ? "Reached the maximum amount of warns."
                    : "Warned on parole."
                )
              ),
            ]
          : [],
      allowedMentions: {
        users: [member.id],
      },
    });
    if (warn.muteExpires === null && timeMs !== undefined) {
      await interaction.followUp(
        "Something went wrong, the user was not muted. The user has been warned, but not muted."
      );
    }
    if (interaction.channel !== config.logChannel)
      config.log({ embeds: [embed], allowedMentions: { users: [member.id] } });
  },
  message: async (interaction: Message, { alias, args }) => {
    const config = configs.get(interaction.guildId!)!;
    args = args ?? [];
    const rawUser = args[0];
    let user: User;
    try {
      user = await interaction.client.users.fetch(
        rawUser.replace(/[<@!>]/g, "")
      );
    } catch (e) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotFound)
              .setDescription("Please provide a valid user.")
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
    if (!alias || alias === "warn") alias = "w";
    // Reason will either be args[1] and forwards or args[2] and forwards depending on the alias
    const reason =
      alias === "w" ? args.slice(1).join(" ") : args.slice(2).join(" ");
    const time = alias === "wm" ? args[1] : undefined;
    if (alias === "wm" && !time) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                `The correct syntax for this command is:\n \`\`\`${config.prefix}wm <user> <mute> [reason]\`\`\``
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
    const timeMs = time ? ms(time) : undefined;
    const member = interaction.guild!.members.cache.get(user.id) as GuildMember;

    const force = interaction.member?.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    if (!member) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
              .setDescription(`<@${user.id}> is not a member of this server.`)
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
    if (member.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBot)
              .setDescription("What have I done wrong? :(")
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
    if (time && (!timeMs || timeMs < 0 || timeMs > 3.1536e10) /* 1 year */) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorInvalidTime)
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
    if (
      member.roles.highest.position >=
        (interaction.member?.roles as GuildMemberRoleManager).highest
          .position &&
      !force && member.id !== interaction.author.id
    ) {
      return interaction.reply({
        embeds: [
          safeEmbed(
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
                })`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        allowedMentions: {
          users: [],
        },
      });
    }

    if (
      time &&
      member.communicationDisabledUntilTimestamp &&
      member.communicationDisabledUntilTimestamp > Date.now()
    ) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserMuted)
              .setDescription(
                `<@${member.id}> is already muted. Unmute them first.`
              )
              .setFields([
                {
                  name: "Expires At",
                  value: `<t:${Math.floor(
                    member.communicationDisabledUntilTimestamp / 1000
                  )}:f>`,
                },
              ])
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }

    const warn = await warnMember(
      member,
      interaction.member as GuildMember,
      1,
      reason || undefined,
      timeMs ? new Date(Date.now() + timeMs) : undefined
    );

    if (warn.response === WarnResponse.RateLimited) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorCooldown)
              .setDescription(
                "To prevent accidentally warning a user multiple times, there is a 10 second cooldown between warnings of the same user."
              )
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }

    if (warn.response === WarnResponse.isAtMaxWarns) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "This user has already reached the maximum amount of warns. Please ban them instead."
              )
              .setFields([
                {
                  name: "Active warnings",
                  value: warn.warns
                    .map(
                      (warn) =>
                        `<t:${Math.floor(
                          warn.timestamp.getTime() / 1000
                        )}:f> - ${warn.reason} - ${
                          warn.severity === 1 ? "Light" : "Heavy"
                        } - Issued by <@${warn.moderatorID}>`
                    )
                    .join("\n"),
                },
              ])
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            getBanButton(member.user, "Reached the maximum amount of warns.")
          ),
        ],
        allowedMentions: {
          users: [],
        },
      });
    }

    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Warned")
        .setDescription(
          `Warned <@${member.id}> for \`${reason || "No reason provided"}\`. ${
            warn.dmSent
              ? "They have been notified."
              : "They could not be notified."
          }`
        )
        .setFields([
          {
            name: "Severity",
            value: `Light`,
          },
          {
            name: "Mute expires",
            value: warn.muteExpires
              ? `<t:${Math.floor(warn.muteExpires.getTime() / 1000)}:f>`
              : "Not muted",
          },
          {
            name: "Reason",
            value: reason || "No reason provided",
          },
        ])
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.author.tag}`,
          iconURL: interaction.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now())
    );

    const warns = warn.warns;
    if (warns.length > 0) {
      embed.addFields([
        {
          name: "Active warnings",
          value:
            warns
              .map(
                (warn) =>
                  `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${
                    warn.reason
                  } - ${
                    warn.severity === 1 ? "Light" : "Heavy"
                  } - Issued by <@${warn.moderatorID}>`
              )
              .join("\n") || "No active warnings.",
        },
      ]);
    }
    if (warn.response !== WarnResponse.Success) {
      embed.addFields([
        {
          name: "Ban warning",
          value: `Reason: \`${
            warn.response === WarnResponse.reachedMaxWarns
              ? "Reached the maximum amount of warns."
              : "Warned on parole."
          }\`. This user should be banned, they have been muted for 24 hours in the meanwhile.`,
        },
      ]);
      embed.setColor(EmbedColors.warning);
    }
    await interaction.reply({
      embeds: [embed],
      components:
        warn.response !== WarnResponse.Success
          ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                getBanButton(
                  member.user,
                  warn.response === WarnResponse.reachedMaxWarns
                    ? "Reached the maximum amount of warns."
                    : "Warned on parole."
                )
              ),
            ]
          : [],
      allowedMentions: {
        users: [member.id],
      },
    });
    if (warn.muteExpires === null && timeMs !== undefined) {
      await interaction.reply(
        "Something went wrong, the user was not muted. The user has been warned, but not muted."
      );
    }
    if (interaction.channel !== config.logChannel)
      config.log({ embeds: [embed], allowedMentions: { users: [member.id] } });
  },
} as Command;
