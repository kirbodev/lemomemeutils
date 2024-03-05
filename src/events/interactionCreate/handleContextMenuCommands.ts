import {
  Client,
  Interaction,
  PermissionsBitField,
  EmbedBuilder,
  GuildMemberRoleManager,
} from "discord.js";
import configs, { devs, testServer, maintainanceMode } from "../../config";
import getLocalCommands from "../../helpers/getLocalCommands";
import logger from "../../helpers/logger";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import getPermissionName from "../../helpers/getPermissionName";
import { getCooldown, setCooldown } from "../../handlers/cooldownHandler";
import ms from "ms";
import analytics from "../../db/models/analytics";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isContextMenuCommand()) return;
  const localCommands = await getLocalCommands();
  const command = localCommands.find(
    (command) =>
      command.contextName === interaction.commandName ||
      command.name === interaction.commandName
  );
  if (!command) return;
  const config = configs.get(interaction.guildId!);
  if (maintainanceMode && !devs.includes(interaction.user.id))
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorMaintainanceMode)
          .setDescription(
            process.env.NODE_ENV
              ? "This is the testing bot, commands are not available to you."
              : "The bot is currently in maintainance mode, try again later."
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
  if (command.devOnly && !devs.includes(interaction.user.id))
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorDevOnly)
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
      ephemeral: true,
    });
  if (command.testOnly && interaction.guildId !== testServer)
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorTestOnly)
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
      ephemeral: true,
    });
  // Check if user has any of the required permissions
  if (
    command.permissionsRequired &&
    !(interaction.member?.permissions as PermissionsBitField).has(
      command.permissionsRequired
    ) &&
    !(interaction.member?.permissions as PermissionsBitField).has(
      "Administrator"
    )
  )
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorPermissions)
          .setDescription(
            `You need the following permissions to use this command: ${command.permissionsRequired
              .map((permission) => `\`${getPermissionName(permission)}\``)
              .join(", ")}`
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
  if (command.requiresHighStaff) {
    if (!config?.highStaffRole) return;
    if (
      !(interaction.member!.roles as GuildMemberRoleManager).cache.has(
        config.highStaffRole
      )
    )
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorPermissions)
            .setDescription("You need the High Staff role to use this command.")
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
  const cooldown = getCooldown(interaction.user.id, command.name);
  if (cooldown && cooldown > Date.now())
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorCooldown)
          .setDescription(
            `You can use this command again in ${ms(cooldown - Date.now(), {
              long: true,
            })}`
          )
          .setColor(EmbedColors.info)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
      ephemeral: true,
    });
  try {
    if (interaction.replied) return;
    setCooldown(interaction.user.id, command.name);
    const now = performance.now();
    await command.contextMenu!(interaction);
    const analytic = new analytics({
      name: command.name,
      responseTime: performance.now() - now,
      type: "contextMenu",
      userID: interaction.user.id,
      guildID: interaction.guildId!,
    });
    analytic.save();
  } catch (e) {
    const embed = new EmbedBuilder()
      .setTitle(Errors.ErrorServer)
      .setDescription("An error occurred while executing this command.")
      .setColor(EmbedColors.error)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp(Date.now());
    try {
      interaction.reply({
        embeds: [embed],
        components: [],
        ephemeral: true,
      });
    } catch (e) {
      interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
    logger.error(
      e,
      `Error while executing contextMenu command ${command.name}`
    );
  }
};
