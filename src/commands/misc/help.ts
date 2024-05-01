import {
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  StringSelectMenuInteraction,
  ApplicationCommandType,
  Message,
  PermissionsBitField,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import { getCachedCommands } from "../../helpers/getLocalCommands.js";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import configs, { devs, testServer } from "../../config.js";
import { nanoid } from "nanoid";
import getPermissionName from "../../helpers/getPermissionName.js";
import { client } from "../../index.js";
import ms from "ms";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "help",
  description: "Gives useful information and syntax for commands",
  options: [
    {
      name: "command",
      description: "The command to get help for.",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: client.application?.commands.cache
        .filter((command) => command.type === ApplicationCommandType.ChatInput)
        .map((command) => ({
          name: command.name,
          value: command.name,
        })),
    },
  ],
  permissionsRequired: [PermissionsBitField.Flags.SendMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const config = configs.get(interaction.guildId!)!;
    const localCommands = getCachedCommands()!;
    const commandName = interaction.options.getString("command");
    if (commandName) {
      const command = localCommands.find(
        (command) => command.name === commandName
      );
      if (!command) {
        return interaction.followUp({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorCommandNotFound)
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
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(`Help | ${command.name}`)
              .setColor(EmbedColors.success)
              .setFields([
                {
                  name: "Description",
                  value: command.description,
                },
                {
                  name: "Permissions Required",
                  value:
                    command.permissionsRequired
                      ?.map(
                        (permission) => `\`${getPermissionName(permission)}\``
                      )
                      .join(", ") ?? "None",
                },
                {
                  name: "Syntax (Message)",
                  value: command.message
                    ? command.syntax
                      ? `${command.syntax.replaceAll(
                          "prefix",
                          config.prefix || ","
                        )}`
                      : `${config.prefix || ","}${command.name} ${
                          command.options
                            ?.map(
                              (option) =>
                                `${
                                  option.required
                                    ? `<${option.name}>`
                                    : `[${option.name}]`
                                }`
                            )
                            .join(" ") ?? ""
                        }`
                    : "This command is slash only.",
                },
                {
                  name: "Syntax (Slash)",
                  // Slash syntax doesn't use command.syntax because it's already in the command options
                  value: command.slash
                    ? `/${command.name} ${
                        command.options
                          ?.map(
                            (option) =>
                              `${
                                option.required
                                  ? `<${option.name}>`
                                  : `[${option.name}]`
                              }`
                          )
                          .join(" ") ?? ""
                      }`
                    : "This command is message only.",
                },
                {
                  name: "Supported Methods",
                  value: `**Slash:** ${
                    command.slash ? "Yes" : "No"
                  }\n**Message:** ${
                    command.message ? "Yes" : "No"
                  }\n**ContextMenu:** ${command.contextMenu ? "Yes" : "No"}`,
                },
                {
                  name: "Dev Only",
                  value: command.devOnly ? "Yes" : "No",
                },
                {
                  name: "Cooldown",
                  value: command.cooldown
                    ? `${ms(command.cooldown, { long: true })}`
                    : "None",
                },
                {
                  name: "Aliases",
                  value:
                    command.aliases
                      ?.map((alias) => `\`${alias}\``)
                      .join(", ") ?? "None",
                },
                {
                  name: "Accessible to you",
                  value:
                    (command.devOnly && !devs.includes(interaction.user.id)) ||
                    (command.testOnly && interaction.guildId !== testServer) ||
                    (command.permissionsRequired &&
                      !interaction.memberPermissions?.has(
                        command.permissionsRequired
                      ))
                      ? "No"
                      : "Yes",
                },
              ])
          ),
        ],
        ephemeral: true,
      });
    } else {
      const selectMenuId = nanoid();
      await interaction.followUp({
        components: [
          new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
              .setCustomId(selectMenuId)
              .setPlaceholder("Select a command")
              .addOptions(
                localCommands.map((command) => ({
                  label: command.name,
                  value: command.name,
                }))
              ),
          ]) as ActionRowBuilder<StringSelectMenuBuilder>,
        ],
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Help")
              .setDescription("Select a command to get help for.")
              .setColor(EmbedColors.success)
          ),
        ],
        ephemeral: true,
      });
      const filter = (i: StringSelectMenuInteraction) =>
        i.customId === selectMenuId && i.user.id === interaction.user.id;
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter,
        time: 120000,
      });
      collector?.on("collect", async (interaction) => {
        if (interaction.customId !== selectMenuId) return;
        const command = localCommands.find(
          (command) => command.name === interaction.values[0]
        );
        if (!command) {
          interaction.followUp({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle(Errors.ErrorCommandNotFound)
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
          return;
        }
        await interaction.update({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(`Help | ${command.name}`)
                .setColor(EmbedColors.success)
                .setFields([
                  {
                    name: "Description",
                    value: command.description,
                  },
                  {
                    name: "Permissions Required",
                    value:
                      command.permissionsRequired
                        ?.map(
                          (permission) => `\`${getPermissionName(permission)}\``
                        )
                        .join(", ") ?? "None",
                  },
                  {
                    name: "Syntax (Message)",
                    value: command.message
                      ? command.syntax
                        ? `${command.syntax.replaceAll(
                            "prefix",
                            config.prefix || ","
                          )}`
                        : `${config.prefix || ","}${command.name} ${
                            command.options
                              ?.map(
                                (option) =>
                                  `${
                                    option.required
                                      ? `<${option.name}>`
                                      : `[${option.name}]`
                                  }`
                              )
                              .join(" ") ?? ""
                          }`
                      : "This command is slash only.",
                  },
                  {
                    name: "Syntax (Slash)",
                    // Slash syntax doesn't use command.syntax because it's already in the command options
                    value: command.slash
                      ? `/${command.name} ${
                          command.options
                            ?.map(
                              (option) =>
                                `${
                                  option.required
                                    ? `<${option.name}>`
                                    : `[${option.name}]`
                                }`
                            )
                            .join(" ") ?? ""
                        }`
                      : "This command is message only.",
                  },
                  {
                    name: "Supported Methods",
                    value: `**Slash:** ${
                      command.slash ? "Yes" : "No"
                    }\n**Message:** ${
                      command.message ? "Yes" : "No"
                    }\n**ContextMenu:** ${command.contextMenu ? "Yes" : "No"}`,
                  },
                  {
                    name: "Dev Only",
                    value: command.devOnly ? "Yes" : "No",
                  },
                  {
                    name: "Cooldown",
                    value: command.cooldown
                      ? `${ms(command.cooldown, { long: true })}`
                      : "None",
                  },
                  {
                    name: "Aliases",
                    value:
                      command.aliases
                        ?.map((alias) => `\`${alias}\``)
                        .join(", ") ?? "None",
                  },
                  {
                    name: "Accessible to you",
                    value:
                      (command.devOnly &&
                        !devs.includes(interaction.user.id)) ||
                      (command.testOnly &&
                        interaction.guildId !== testServer) ||
                      (command.permissionsRequired &&
                        !interaction.memberPermissions?.has(
                          command.permissionsRequired
                        ))
                        ? "No"
                        : "Yes",
                  },
                ])
            ),
          ],
        });
      });
      collector?.on("end", async () => {
        await interaction.editReply({
          components: [],
        });
      });
    }
  },
  async message(interaction: Message, { args }) {
    args = args ?? [];
    const config = configs.get(interaction.guildId!)!;
    const localCommands = getCachedCommands()!;
    const commandName = args[0];
    if (commandName) {
      const command = localCommands.find(
        (command) => command.name === commandName
      );
      if (!command) {
        return interaction.reply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorCommandNotFound)
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
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(`Help | ${command.name}`)
              .setColor(EmbedColors.success)
              .setFields([
                {
                  name: "Description",
                  value: command.description,
                },
                {
                  name: "Permissions Required",
                  value:
                    command.permissionsRequired
                      ?.map(
                        (permission) => `\`${getPermissionName(permission)}\``
                      )
                      .join(", ") ?? "None",
                },
                {
                  name: "Syntax (Message)",
                  value: command.message
                    ? command.syntax
                      ? `${command.syntax.replaceAll(
                          "prefix",
                          config.prefix || ","
                        )}`
                      : `${config.prefix || ","}${command.name} ${
                          command.options
                            ?.map(
                              (option) =>
                                `${
                                  option.required
                                    ? `<${option.name}>`
                                    : `[${option.name}]`
                                }`
                            )
                            .join(" ") ?? ""
                        }`
                    : "This command is slash only.",
                },
                {
                  name: "Syntax (Slash)",
                  // Slash syntax doesn't use command.syntax because it's already in the command options
                  value: `/${command.name} ${
                    command.options
                      ?.map(
                        (option) =>
                          `${
                            option.required
                              ? `<${option.name}>`
                              : `[${option.name}]`
                          }`
                      )
                      .join(" ") ?? ""
                  }`,
                },
                {
                  name: "Supported Methods",
                  value: `**Slash:** Yes\n**Message:** ${
                    command.message ? "Yes" : "No"
                  }\n**ContextMenu:** ${command.contextMenu ? "Yes" : "No"}`,
                },
                {
                  name: "Dev Only",
                  value: command.devOnly ? "Yes" : "No",
                },
                {
                  name: "Cooldown",
                  value: command.cooldown
                    ? `${ms(command.cooldown, { long: true })}`
                    : "None",
                },
                {
                  name: "Aliases",
                  value:
                    command.aliases
                      ?.map((alias) => `\`${alias}\``)
                      .join(", ") ?? "None",
                },
                {
                  name: "Accessible to you",
                  value:
                    (command.devOnly &&
                      !devs.includes(interaction.author.id)) ||
                    (command.testOnly && interaction.guildId !== testServer) ||
                    (command.permissionsRequired &&
                      !interaction.member!.permissions?.has(
                        command.permissionsRequired
                      ))
                      ? "No"
                      : "Yes",
                },
              ])
          ),
        ],
      });
    } else {
      const selectMenuId = nanoid();
      const reply = await interaction.reply({
        components: [
          new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
              .setCustomId(selectMenuId)
              .setPlaceholder("Select a command")
              .addOptions(
                localCommands.map((command) => ({
                  label: command.name,
                  value: command.name,
                }))
              ),
          ]) as ActionRowBuilder<StringSelectMenuBuilder>,
        ],
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Help")
              .setDescription("Select a command to get help for.")
              .setColor(EmbedColors.success)
          ),
        ],
      });
      const filter = (i: StringSelectMenuInteraction) =>
        i.customId === selectMenuId && i.user.id === interaction.author.id;
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter,
        time: 120000,
      });
      collector?.on("collect", async (interaction) => {
        if (interaction.customId !== selectMenuId) return;
        const command = localCommands.find(
          (command) => command.name === interaction.values[0]
        );
        if (!command) {
          interaction.followUp({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle(Errors.ErrorCommandNotFound)
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
          return;
        }
        await interaction.update({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(`Help | ${command.name}`)
                .setColor(EmbedColors.success)
                .setFields([
                  {
                    name: "Description",
                    value: command.description,
                  },
                  {
                    name: "Permissions Required",
                    value:
                      command.permissionsRequired
                        ?.map(
                          (permission) => `\`${getPermissionName(permission)}\``
                        )
                        .join(", ") ?? "None",
                  },
                  {
                    name: "Syntax (Message)",
                    value: command.syntax
                      ? `${command.syntax.replaceAll(
                          "prefix",
                          config.prefix || ","
                        )}`
                      : `${config.prefix || ","}${command.name} ${
                          command.options
                            ?.map(
                              (option) =>
                                `${
                                  option.required
                                    ? `<${option.name}>`
                                    : `[${option.name}]`
                                }`
                            )
                            .join(" ") ?? ""
                        }`,
                  },
                  {
                    name: "Supported Methods",
                    value: `**Slash:** Yes\n**Message:** ${
                      command.message ? "Yes" : "No"
                    }\n**ContextMenu:** ${command.contextMenu ? "Yes" : "No"}`,
                  },
                  {
                    name: "Dev Only",
                    value: command.devOnly ? "Yes" : "No",
                  },
                  {
                    name: "Cooldown",
                    value: command.cooldown
                      ? `${ms(command.cooldown, { long: true })}`
                      : "None",
                  },
                  {
                    name: "Aliases",
                    value:
                      command.aliases
                        ?.map((alias) => `\`${alias}\``)
                        .join(", ") ?? "None",
                  },
                  {
                    name: "Accessible to you",
                    value:
                      (command.devOnly &&
                        !devs.includes(interaction.user.id)) ||
                      (command.testOnly &&
                        interaction.guildId !== testServer) ||
                      (command.permissionsRequired &&
                        !interaction.memberPermissions?.has(
                          command.permissionsRequired
                        ))
                        ? "No"
                        : "Yes",
                  },
                ])
            ),
          ],
        });
      });
      collector?.on("end", async () => {
        await reply.edit({
          components: [],
        });
      });
    }
  },
} as Command;
