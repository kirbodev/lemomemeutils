import type {
  ChatInputCommandInteraction,
  Message /* ContextMenuCommandInteraction, Message */,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import {
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
} from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import { Action } from "../../db/index";
import configs from "../../config";
import logger from "../../helpers/logger";
import safeEmbed from "../../utils/safeEmbed";

export default {
  name: "unban",
  description: "Unban a user and optionally apply parole.",
  options: [
    {
      name: "user",
      description: "The user ID to unban.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "parole",
      description: "Whether or not to apply parole to the user.",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: "ice",
      description:
        "The ice severity to apply to the user. Leave blank for no ice.",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        {
          name: "Thin Ice",
          value: "thin",
        },
        {
          name: "Thinner Ice",
          value: "thinner",
        },
      ],
    },
    {
      name: "reason",
      description: "The reason for unbanning the user.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  cooldown: 10000,
  syntax: "<user> [parole (true/false)] [ice (thin/thinner)] [reason]",
  permissionsRequired: [PermissionsBitField.Flags.ManageRoles],
  aliases: ["ub"],
  requiresHighStaff: true,
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const userID = interaction.options.getString("user")!;
    const parole = interaction.options.getBoolean("parole") ?? false;
    const ice = interaction.options.getString("ice");
    const reason = interaction.options.getString("reason");
    const config = configs.get(interaction.guildId!)!;

    let user;
    try {
      user = await interaction.client.users.fetch(userID);
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
    } catch (e) {
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
    if ((ice && !config.thinIceRoleID) || (ice && !config.thinnerIceRoleID)) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorCommand)
              .setDescription(
                "The `ice` option is not available in this server."
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

    try {
      try {
        await interaction.guild?.members.unban(
          user,
          reason || "No reason provided"
        );
      } catch (e) {
        return interaction.followUp({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorUserNotBanned)
                .setDescription(
                  `${
                    interaction.guild?.members.cache.has(user.id)
                      ? `<@${user.id}> is not banned and is in the server.`
                      : `<@${user.id}> is not banned and is not in the server.`
                  }`
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
      await Action.findOneAndUpdate(
        { userID: user.id, actionType: "ban", guildID: interaction.guildId },
        { forceExpired: true }
      ).sort({ timestamp: -1 });
      const action = new Action({
        userID: user.id,
        moderatorID: interaction.user.id,
        guildID: interaction.guildId,
        actionType: "unban",
        reason: reason || "No reason provided",
        withParole: parole,
        iceSeverity: ice === "thin" ? 0 : ice === "thinner" ? 1 : undefined,
      });
      await action.save();
      const embed = safeEmbed(
        new EmbedBuilder()
          .setTitle("Unbanned")
          .setDescription(
            `Unbanned <@${user.id}> for \`${
              reason ? reason : "No reason provided"
            }\``
          )
          .setFields([
            {
              name: "Parole",
              value: `${parole ? "Yes" : "No"}`,
            },
            {
              name: "Ice Severity",
              value: `${
                ice
                  ? `<@&${
                      ice == "thin"
                        ? config.thinIceRoleID
                        : config.thinnerIceRoleID
                    }>`
                  : "None"
              }`,
            },
          ])
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
      logger.warn(`Unban command failed to unban user. ${e}`);
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("Something went wrong while unbanning the user.")
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
    args = args ?? [];
    const userID = args[0];
    const parole =
      args[1] === "true" || args[2] === "true"
        ? true
        : args[1] === "false" || args[2] === "false"
        ? false
        : undefined;
    const ice =
      args[1] === "thin" || args[2] === "thin"
        ? "thin"
        : args[1] === "thinner" || args[2] === "thinner"
        ? "thinner"
        : undefined;
    const reason = parole
      ? ice
        ? args.slice(3).join(" ")
        : args.slice(2).join(" ")
      : args.slice(1).join(" ");
    const config = configs.get(interaction.guildId!)!;

    let user;
    try {
      user = await interaction.client.users.fetch(userID);
      if (!user) {
        return interaction.reply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorUserNotFound)
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
    } catch (e) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotFound)
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
    if ((ice && !config.thinIceRoleID) || (ice && !config.thinnerIceRoleID)) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorCommand)
              .setDescription(
                "The `ice` option is not available in this server."
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

    try {
      try {
        await interaction.guild?.members.unban(
          user,
          reason || "No reason provided"
        );
      } catch (e) {
        return interaction.reply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorUserNotBanned)
                .setDescription(
                  `${
                    interaction.guild?.members.cache.has(user.id)
                      ? `<@${user.id}> is not banned and is in the server.`
                      : `<@${user.id}> is not banned and is not in the server.`
                  }`
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
      await Action.findOneAndUpdate(
        { userID: user.id, actionType: "ban", guildID: interaction.guildId },
        { forceExpired: true }
      ).sort({ timestamp: -1 });
      const action = new Action({
        userID: user.id,
        moderatorID: interaction.author.id,
        guildID: interaction.guildId,
        actionType: "unban",
        reason: reason || "No reason provided",
        withParole: parole,
        iceSeverity: ice === "thin" ? 0 : ice === "thinner" ? 1 : undefined,
      });
      await action.save();
      const embed = safeEmbed(
        new EmbedBuilder()
          .setTitle("Unbanned")
          .setDescription(
            `Unbanned <@${user.id}> for \`${
              reason ? reason : "No reason provided"
            }\``
          )
          .setFields([
            {
              name: "Parole",
              value: `${parole ? "Yes" : "No"}`,
            },
            {
              name: "Ice Severity",
              value: `${
                ice
                  ? `<@&${
                      ice == "thin"
                        ? config.thinIceRoleID
                        : config.thinnerIceRoleID
                    }>`
                  : "None"
              }`,
            },
          ])
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
      logger.warn(`Unban command failed to unban user. ${e}`);
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorGeneric)
              .setDescription("Something went wrong while unbanning the user.")
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
