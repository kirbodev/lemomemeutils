import {
  Client,
  Message,
  PermissionsBitField,
  EmbedBuilder,
  GuildMemberRoleManager,
} from "discord.js";
import getLocalCommands from "../../helpers/getLocalCommands.js";
import configs, {
  devs,
  hardResponses,
  maintainanceMode,
  testServer,
} from "../../config.js";
import logger from "../../helpers/logger.js";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import getPermissionName from "../../helpers/getPermissionName.js";
import { getCooldown, setCooldown } from "../../handlers/cooldownHandler.js";
import ms from "ms";
import analytics from "../../db/models/analytics.js";
import safeEmbed from "../../utils/safeEmbed.js";
import { dbStatus } from "../../handlers/errorHandler.js";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  const config = configs.get(message.guild.id);
  if (!config) return;
  let res;
  for (const resp in hardResponses) {
    if (resp.startsWith("regex:")) {
      const regex = new RegExp(resp.slice(6));
      if (regex.test(message.content.toLowerCase())) {
        res = hardResponses[resp];
        break;
      }
      continue;
    }
    if (resp === message.content.toLowerCase()) {
      res = hardResponses[resp];
      break;
    }
  }
  if (res) return message.reply(res);
  const prefix = config?.prefix || ",";
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const localCommands = await getLocalCommands();
  let command = localCommands.find(
    (command) =>
      command.name === message.content.slice(prefix.length).split(" ")[0]
  );
  if (!command) {
    command = localCommands.find((command) =>
      command.aliases?.includes(
        message.content.slice(prefix.length).split(" ")[0]
      )
    );
    if (!command) return;
  }
  if (!command.message) {
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorCommand)
            .setDescription(
              `The command \`${command.name}\` does not support message commands.`
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  }
  if (
    maintainanceMode &&
    !devs.includes(message.author.id) &&
    message.guildId !== testServer
  )
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorMaintainanceMode)
            .setDescription(
              process.env.NODE_ENV
                ? "This is the testing bot, commands are not available to you."
                : "The bot is currently in maintainance mode, try again later."
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  if (command.devOnly && !devs.includes(message.author.id))
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorDevOnly)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  if (command.testOnly && message.guildId !== testServer)
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorTestOnly)
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  // Check if user has any of the required permissions
  if (
    command.permissionsRequired &&
    !(message.member?.permissions as PermissionsBitField).has(
      command.permissionsRequired
    )
  ) {
    if (devs.includes(message.author.id)) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorDevBypass)
              .setDescription(
                "Use slash commands to bypass permissions as a developer."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    } else
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorPermissions)
              .setDescription(
                `You need the following permissions to use this command: ${command.permissionsRequired
                  .map((permission) => `\`${getPermissionName(permission)}\``)
                  .join(", ")}`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
  }
  if (command.requiresHighStaff) {
    if (!config?.highStaffRole) return;
    if (
      !(message.member!.roles as GuildMemberRoleManager).cache.has(
        config.highStaffRole
      ) &&
      /* check for admin permissions */ !(
        message.member?.permissions as PermissionsBitField
      )?.has("Administrator")
    )
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorPermissions)
              .setDescription(
                "You need the High Staff role to use this command."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
  }
  const cooldown = getCooldown(message.author.id, command.name);
  if (cooldown && cooldown > Date.now())
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorCooldown)
            .setDescription(
              `You can use this command again in ${ms(cooldown - Date.now(), {
                long: true,
              })}.`
            )
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });
  const options = message.content.slice(prefix.length).split(" ");
  options.shift(); // Remove the command name
  const requiredOptions = command.options?.filter((option) => option.required);
  if (requiredOptions && requiredOptions.length > options.length)
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(
              `The correct syntax for this command is:\n \`\`\`${
                command.syntax?.replaceAll("prefix", prefix) ||
                `${prefix}${command.name} ${command.options
                  ?.map((option) =>
                    option.required ? `<${option.name}>` : `[${option.name}]`
                  )
                  .join(" ")}`
              }\`\`\``
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });

  try {
    // Call the message command with the parameters: message and the alias used
    setCooldown(message.author.id, command.name);
    const now = performance.now();
    await command.message(message, {
      alias: message.content.slice(prefix.length).split(" ")[0],
      args: options,
    });
    if (!dbStatus) {
      const analytic = new analytics({
        name: command.name,
        responseTime: performance.now() - now,
        type: "message",
        userID: message.author.id,
        guildID: message.guild.id,
      });
      await analytic.save();
    }
  } catch (e) {
    message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
        .setTitle(Errors.ErrorServer)
        .setDescription("An error occurred while executing this command.")
        .setColor(EmbedColors.error)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp(Date.now())
        ),
      ]
    });
    logger.error(e, `Error while executing command ${command.name}`);
  }
};
