import {
  Client,
  Message,
  PermissionsBitField,
  EmbedBuilder,
  GuildMemberRoleManager,
} from "discord.js";
import getLocalCommands from "../../helpers/getLocalCommands";
import configs, { devs, testServer } from "../../config";
import logger from "../../helpers/logger";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import getPermissionName from "../../helpers/getPermissionName";
import { getCooldown, setCooldown } from "../../handlers/cooldownHandler";
import ms from "ms";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  const config = configs.get(message.guild.id);
  if (!config) return;
  const prefix = config?.prefix || ",";
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const localCommands = await getLocalCommands();
  let command = localCommands.find(
    (command) =>
      command.name === message.content.slice(prefix.length).split(" ")[0],
  );
  if (!command) {
    command = localCommands.find((command) =>
      command.aliases?.includes(
        message.content.slice(prefix.length).split(" ")[0],
      ),
    );
    if (!command) return;
  }
  if (!command.message) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorCommand)
          .setDescription(
            `The command \`${command.name}\` does not support message commands.`,
          )
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });
  }
  if (command.devOnly && !devs.includes(message.author.id))
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorDevOnly)
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });
  if (command.testOnly && message.guildId !== testServer)
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorTestOnly)
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });
  // Check if user has any of the required permissions
  if (
    command.permissionsRequired &&
    !(message.member?.permissions as PermissionsBitField).has(
      command.permissionsRequired,
    )
  )
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorPermissions)
          .setDescription(
            `You need the following permissions to use this command: ${command.permissionsRequired
              .map((permission) => `\`${getPermissionName(permission)}\``)
              .join(", ")}`,
          )
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });
  if (command.requiresHighStaff) {
    if (!config?.highStaffRole) return;
    if (
      !(message.member!.roles as GuildMemberRoleManager).cache.has(
        config.highStaffRole,
      ) &&
      /* check for admin permissions */ !(
        message.member?.permissions as PermissionsBitField
      )?.has("Administrator")
    )
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorPermissions)
            .setDescription("You need the High Staff role to use this command.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
      });
  }
  const cooldown = getCooldown(message.author.id, command.name);
  if (cooldown && cooldown > Date.now())
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorCooldown)
          .setDescription(
            `You can use this command again in ${ms(cooldown - Date.now(), {
              long: true,
            })}.`,
          )
          .setColor(EmbedColors.info)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });
  const options = message.content.slice(prefix.length).split(" ");
  options.shift(); // Remove the command name
  const requiredOptions = command.options?.filter((option) => option.required);
  if (requiredOptions && requiredOptions.length > options.length)
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(Errors.ErrorUser)
          .setDescription(
            `The correct syntax for this command is:\n \`\`\`${
              command.syntax?.replaceAll("prefix", prefix) ||
              `${prefix}${command.name} ${command.options
                ?.map((option) =>
                  option.required ? `<${option.name}>` : `[${option.name}]`,
                )
                .join(" ")}`
            }\`\`\``,
          )
          .setColor(EmbedColors.error)
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(Date.now()),
      ],
    });

  try {
    // Call the message command with the parameters: message and the alias used
    setCooldown(message.author.id, command.name);
    await command.message(message, {
      alias: message.content.slice(prefix.length).split(" ")[0],
      args: options,
    });
  } catch (e) {
    message.reply("An error occurred while executing this command");
    logger.error(e, `Error while executing command ${command.name}`);
  }
};
