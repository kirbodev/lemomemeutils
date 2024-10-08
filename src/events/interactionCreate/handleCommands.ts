import {
  Client,
  Interaction,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import configs, { devs, testServer, maintainanceMode } from "../../config.js";
import getLocalCommands from "../../helpers/getLocalCommands.js";
import logger from "../../helpers/logger.js";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import getPermissionName from "../../helpers/getPermissionName.js";
import Dev from "../../db/models/dev.js";
import { nanoid } from "nanoid";
import showOTPModal from "../../helpers/showOTPModal.js";
import { getCooldown, setCooldown } from "../../handlers/cooldownHandler.js";
import ms from "ms";
import analytics from "../../db/models/analytics.js";
import safeEmbed from "../../utils/safeEmbed.js";
import { dbStatus } from "../../handlers/errorHandler.js";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;
  const localCommands = await getLocalCommands();
  const command = localCommands.find(
    (command) => command.name === interaction.commandName
  );
  if (!command) return;
  const config = configs.get(interaction.guildId!);

  if (
    maintainanceMode &&
    !devs.includes(interaction.user.id) &&
    interaction.guildId !== testServer
  )
    return interaction.reply({
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
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
      ephemeral: true,
    });
  if (command.devOnly && !devs.includes(interaction.user.id))
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorDevOnly)
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
  if (command.testOnly && interaction.guildId !== testServer)
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorTestOnly)
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
  // Check if user has any of the required permissions
  let devBypass = false;
  if (
    command.permissionsRequired &&
    !(interaction.member?.permissions as PermissionsBitField).has(
      command.permissionsRequired
    )
  ) {
    if (devs.includes(interaction.user.id)) {
      devBypass = true;
    } else
      return interaction.reply({
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
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
  }
  if (command.requiresHighStaff) {
    if (!config?.highStaffRole) return;
    if (
      !(interaction.member!.roles as GuildMemberRoleManager).cache.has(
        config.highStaffRole
      ) &&
      !(interaction.member?.permissions as PermissionsBitField).has(
        "Administrator"
      )
    ) {
      if (devs.includes(interaction.user.id)) {
        devBypass = true;
      } else
        return interaction.reply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorPermissions)
                .setDescription(
                  "You need the High Staff role to use this command."
                )
                .setColor(EmbedColors.error)
                .setFooter({
                  text: `Requested by ${interaction.user.tag}`,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp(Date.now()),
              {
                withSystemMessages: false,
              }
            ),
          ],
          ephemeral: true,
        });
    }
  }
  const cooldown = getCooldown(interaction.user.id, command.name);
  if (!devs.includes(interaction.user.id) && cooldown && cooldown > Date.now())
    return interaction.reply({
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
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
          {
            withSystemMessages: false,
          }
        ),
      ],
      ephemeral: true,
    });
  if (command.otpRequired || devBypass) {
    if (dbStatus)
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorServer)
              .setDescription(
                "Since the database is down, I can't verify your identity. Please try again later."
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
    // Check if user has OTP enabled
    const dev = await Dev.findOne({ id: interaction.user.id });
    const otpCommand = client.application?.commands.cache.find(
      (command) => command.name === "otp"
    )?.id;
    if (!dev)
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorOTPRequired)
              .setDescription(
                `You need to enable OTP to use this command. You can enable OTP by using the ${
                  otpCommand ? `</otp:${otpCommand}>` : "/otp"
                } command.`
              )
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
    // Check if OTP has been validated in the last hour
    if (dev.lastVerified && dev.lastVerified.getTime() + 3600000 < Date.now()) {
      const id = nanoid();
      await interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorOTPExpired)
              .setDescription(
                "Your OTP has expired. Enter your OTP from your authenticator app to use this command."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Enter OTP Code")
              .setStyle(ButtonStyle.Primary)
              .setCustomId(id)
          ),
        ],
        ephemeral: true,
      });
      try {
        const i = await interaction.channel?.awaitMessageComponent({
          time: 60000,
          filter: (i) => i.customId === id && i.user.id === interaction.user.id,
        });
        const m = await showOTPModal(i as ButtonInteraction, dev.secret);
        interaction.editReply({
          components: [],
        });
        if (m === "invalid")
          return interaction.editReply({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle(Errors.ErrorUser)
                  .setDescription("The OTP code you entered is invalid.")
                  .setColor(EmbedColors.error)
                  .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
              ),
            ],
            components: [],
          });
        if (m === "timeout")
          return interaction.editReply({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle(Errors.ErrorUser)
                  .setDescription("You did not enter your OTP code in time.")
                  .setColor(EmbedColors.error)
                  .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
              ),
            ],
            components: [],
          });
        try {
          await command.slash!(interaction, m);
        } catch (e) {
          const embed = safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorServer)
              .setDescription("An error occurred while executing this command.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          );
          interaction.replied
            ? interaction.editReply({
                embeds: [embed],
                components: [],
              })
            : interaction.reply({
                embeds: [embed],
                components: [],
                ephemeral: true,
              });
          logger.error(e, `Error while executing command ${command.name}`);
        }
      } catch (err) {
        // timeout
      }
    }
  }
  try {
    if (interaction.replied) return;
    setCooldown(interaction.user.id, command.name);
    const now = performance.now();
    await command.slash!(interaction);
    if (!dbStatus) {
      const analytic = new analytics({
        name: command.name,
        responseTime: performance.now() - now,
        type: "command",
        userID: interaction.user.id,
        guildID: interaction.guildId!,
      });
      await analytic.save();
    }
  } catch (e) {
    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle(Errors.ErrorServer)
        .setDescription("An error occurred while executing this command.")
        .setColor(EmbedColors.error)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now())
    );
    try {
      await interaction.followUp({
        embeds: [embed],
        components: [],
        ephemeral: true,
      });
    } catch (e) {
      interaction
        .reply({
          embeds: [embed],
          components: [],
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    }
    logger.error(e, `Error while executing command ${command.name}`);
  }
};
