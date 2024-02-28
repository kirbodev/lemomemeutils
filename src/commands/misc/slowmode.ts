import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildChannel,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import Command from "../../structures/commandInterface";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import ms from "ms";

export default {
  name: "slowmode",
  description:
    "Sets the slowmode for the specified channel or the current channel if none is specified.",
  options: [
    {
      name: "duration",
      description: "The slowmode duration",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "channel",
      description: "The channel to set the slowmode for",
      type: ApplicationCommandOptionType.Channel,
      required: false, // Not required, so it can be the current channel if not specified
    },
  ],
  permissionsRequired: [PermissionFlagsBits.ManageChannels],
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });

    // Extracting options
    const channelOption = interaction.options.getChannel(
      "channel"
    ) as GuildChannel | null;
    const rawDuration = interaction.options.getString("duration", true);
    const duration = ms(rawDuration);

    // Check if the duration is valid
    if (isNaN(duration) || duration < 0 || duration > 21600000) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorInvalidTime)
            .setDescription(
              "The duration must be a valid time and cannot exceed 6 hours."
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
    }

    // Determine the channel: provided channel or the channel where the command was executed
    const targetChannel =
      (channelOption as TextChannel) || (interaction.channel as TextChannel);

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      await interaction.editReply({
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
      });
      return;
    }

    // Attempt to set the slowmode
    try {
      await targetChannel.setRateLimitPerUser(Math.round(duration / 1000));
      const embed = new EmbedBuilder()
        .setTitle("Slowmode Set")
        .setDescription(
          `Slowmode for <#${targetChannel.id}> has been set to ${ms(duration, {
            long: true,
          })}.`
        )
        .setColor(EmbedColors.success)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now());
      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorGeneric)
            .setDescription("An error occurred while setting the slowmode.")
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
} as Command;
