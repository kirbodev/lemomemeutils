import type {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  Message,
  User /* ContextMenuCommandInteraction, Message */,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import {
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
} from "discord.js";
import EmbedColors from "../../structures/embedColors.js";
import Errors from "../../structures/errors.js";
import logger from "../../helpers/logger.js";
import configs from "../../config.js";
import Action from "../../db/models/action.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "aiunmute",
  description: "Unmute a user from using Sentience.",
  options: [
    {
      name: "user",
      description: "The user to ai unmute.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for ai unmuting the user.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  contextName: "AI Unmute user",
  aliases: ["aium"],
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
    const reason = interaction.options.getString("reason");
    const config = configs.get(interaction.guildId!)!;

    const member = interaction.guild!.members.cache.get(user.id);

    const force = interaction.memberPermissions?.has(
      PermissionsBitField.Flags.Administrator
    );

    if (!user) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotFound)
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
    if (!member) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
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
    if (user.id === interaction.user.id) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorSelf)
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
    if (user.id === interaction.client.user.id) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBot)
              .setDescription(
                "How would I unmute myself from myself, how about you think about that first?"
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
    if (
      member.roles.highest.position >=
        (interaction.member?.roles as GuildMemberRoleManager).highest
          .position &&
      !force
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
      member.roles.highest.position >=
      (interaction.guild!.members.me?.roles as GuildMemberRoleManager).highest
        .position
    ) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBotAuthority)
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

    const currentMute = await Action.findOne({
      actionType: "aimute",
      guildID: interaction.guildId!,
      userID: user.id,
      forceExpired: {
        $ne: true,
      },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date().getTime() } },
      ],
    });

    if (!currentMute) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotMuted)
              .setDescription(`<@${member.id}> is not ai muted.`)
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

    try {
      currentMute.forceExpired = true;
      await currentMute.save();
      let dmSent = false;
      try {
        await user.send({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle("You have been AI unmuted")
                .setDescription(
                  `You have been AI unmuted in \`${interaction.guild!.name}\`.`
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
                ])
                .setColor(EmbedColors.success)
                .setFooter({
                  text: `Unmuted by ${interaction.user.tag}`,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp(Date.now())
            ),
          ],
        });
        dmSent = true;
      } catch (e) {
        // Do nothing
      }
      const mute = new Action({
        actionType: "aiunmute",
        guildID: interaction.guildId!,
        moderatorID: interaction.user.id,
        userID: user.id,
        reason: reason,
      });
      await mute.save();

      const embed = safeEmbed(
        new EmbedBuilder()
          .setTitle("AI Unmuted")
          .setDescription(
            `AI Unmuted <@${user.id}> for \`${
              reason || "No reason provided"
            }\`. ${
              dmSent
                ? "They have been notified."
                : "They could not be notified."
            }`
          )
          .setColor(EmbedColors.success)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(Date.now())
      );
      if (interaction.channel !== config.logChannel)
        config.log({ embeds: [embed] });
      return interaction.followUp({
        embeds: [embed],
      });
    } catch (e) {
      logger.warn(`AI Unmute command failed to ai unmute user. ${e}`);
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription(
                "Something went wrong while AI unmuting the user."
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
  },
  message: async (interaction: Message, { args }) => {
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

    let reason: string | undefined = args.slice(1).join(" ");
    if (!reason) reason = undefined;

    const member = interaction.guild!.members.cache.get(user.id);

    const force = interaction.member?.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    if (!member) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
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
    if (user.id === interaction.author.id) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorSelf)
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
    if (user.id === interaction.client.user.id) {
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
    if (
      member.roles.highest.position >=
        (interaction.member?.roles as GuildMemberRoleManager).highest
          .position &&
      !force
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
      member.roles.highest.position >=
      (interaction.guild!.members.me?.roles as GuildMemberRoleManager).highest
        .position
    ) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBotAuthority)
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

    const currentMute = await Action.findOne({
      actionType: "aimute",
      guildID: interaction.guildId!,
      userID: user.id,
      forceExpired: {
        $ne: true,
      },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date().getTime() } },
      ],
    });

    if (!currentMute) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotMuted)
              .setDescription(`<@${member.id}> is not ai muted.`)
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

    try {
      currentMute.forceExpired = true;
      await currentMute.save();
      let dmSent = false;
      try {
        await user.send({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle("You have been AI unmuted")
                .setDescription(
                  `You have been AI unmuted in \`${interaction.guild!.name}\`.`
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
                ])
                .setColor(EmbedColors.success)
                .setFooter({
                  text: `Unmuted by ${interaction.author.tag}`,
                  iconURL: interaction.author.displayAvatarURL(),
                })
                .setTimestamp(Date.now())
            ),
          ],
        });
        dmSent = true;
      } catch (e) {
        // Do nothing
      }
      const mute = new Action({
        actionType: "aiunmute",
        guildID: interaction.guildId!,
        moderatorID: interaction.author.id,
        userID: user.id,
        reason: reason,
      });
      await mute.save();

      const embed = safeEmbed(
        new EmbedBuilder()
          .setTitle("AI Unmuted")
          .setDescription(
            `AI Unmuted <@${user.id}> for \`${
              reason || "No reason provided"
            }\`. ${
              dmSent
                ? "They have been notified."
                : "They could not be notified."
            }`
          )
          .setColor(EmbedColors.success)
          .setFooter({
            text: `Requested by ${interaction.author.tag}`,
            iconURL: interaction.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now())
      );
      if (interaction.channel !== config.logChannel)
        config.log({ embeds: [embed] });
      return interaction.reply({
        embeds: [embed],
      });
    } catch (e) {
      logger.warn(`AI Unmute command failed to AI unmute user. ${e}`);
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription(
                "Something went wrong while AI unmuting the user."
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
  },
} as Command;
