import type {
  ChatInputCommandInteraction,
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
import { Action } from "../../db";

export default {
  name: "unmute",
  description: "Unmute a user.",
  options: [
    {
      name: "user",
      description: "The user to unmute.",
      type: ApplicationCommandOptionType.User,
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
  aliases: ["um", "unshutup"],
  contextName: "Unmute user",
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
    const reason = interaction.options.getString("reason");
    const config = configs.get(interaction.guildId!)!;

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

    try {
      await member.disableCommunicationUntil(
        null,
        reason || "No reason provided"
      );
      const mutes = await Action.find({
        userID: user.id,
        actionType: "mute",
        guild: interaction.guildId!,
        expiresAt: { $gt: Date.now() },
        forceExpired: false,
      }).sort({ timestamp: -1 });
      for (const mute of mutes) {
        mute.forceExpired = true;
        await mute.save();
      }
      const action = new Action({
        actionType: "unmute",
        guildID: interaction.guildId!,
        moderatorID: interaction.user.id,
        userID: user.id,
        reason,
      });
      await action.save();
      const embed = new EmbedBuilder()
        .setTitle("Unmuted")
        .setDescription(
          `Unmuted <@${user.id}> for \`${reason || "No reason provided"}\`.`
        )
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
      logger.warn(`Unmute command failed to unmute user. ${e}`);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorGeneric)
            .setDescription("Something went wrong while unmuting the user.")
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
    let reason: string | undefined = args.slice(1).join(" ");
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

    try {
      await member.disableCommunicationUntil(
        null,
        reason || "No reason provided"
      );
      const mutes = await Action.find({
        userID: user.id,
        actionType: "mute",
        guild: interaction.guildId!,
        expiresAt: { $gt: Date.now() },
        forceExpired: false,
      }).sort({ timestamp: -1 });
      for (const mute of mutes) {
        mute.forceExpired = true;
        await mute.save();
      }
      const action = new Action({
        actionType: "unmute",
        guildID: interaction.guildId!,
        moderatorID: interaction.author.id,
        userID: user.id,
        reason,
      });
      await action.save();
      const embed = new EmbedBuilder()
        .setTitle("Unmuted")
        .setDescription(
          `Unmuted <@${user.id}> for \`${reason || "No reason provided"}\`.`
        )
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
      logger.warn(`Unmute command failed to unmute user. ${e}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorGeneric)
            .setDescription("Something went wrong while unmuting the user.")
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
