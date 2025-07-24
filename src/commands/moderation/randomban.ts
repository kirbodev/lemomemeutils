import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type Command from "../../structures/commandInterface.js";
import {
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import EmbedColors from "../../structures/embedColors.js";
import Errors from "../../structures/errors.js";
import { Action } from "../../db/index.js";
import logger from "../../helpers/logger.js";
import ms from "ms";
import banMember from "../../helpers/banMember.js";
import configs from "../../config.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "randomban",
  description: "Randomly ban a user. Are you really sure you want to do this?",
  options: [
    {
      name: "grace_time",
      description:
        "The grace period to wait before banning the user. Default is 2 minutes.",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  cooldown: 30000,
  permissionsRequired: [PermissionsBitField.Flags.ManageRoles],
  requiresHighStaff: true,
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const graceTime = interaction.options.getString("grace_time") ?? "2m";
    const config = configs.get(interaction.guildId!)!;
    await interaction.guild!.members.fetch();
    const member = interaction
      .guild!.members.cache.filter(
        (m) =>
          !m.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
          m.roles.cache.size <= 2
      )
      .random();

    const timeMs = graceTime ? ms(graceTime) : 1000 * 60 * 2;

    if (!member) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("I couldn't find a user to ban.")
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

    if (!timeMs || timeMs < 0 || timeMs > 1000 * 60 * 60 * 24) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorInvalidTime)
              .setDescription("The grace time must be between 0 and 1 day.")
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

    const component = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("randban-confirm-" + member.id)
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("randban-cancel-" + member.id)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Member Selected")
        .setDescription(
          `I've randomly selected <@${member.id}> (${member.user.tag}) to ban. Are you sure you want to do this?\n If you continue, they will have a grace period of \`${graceTime}\` to cancel the ban, otherwise they will be banned for 24 hours.`
        )
        .setFields([
          {
            name: "Disclaimer",
            value:
              "While this member has been selected from a list of likely dead accounts or low levels, you bare 100% responsibility for banning them. You have 5 minutes to confirm or cancel the ban.",
          },
        ])
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
    );

    const reply = await interaction.followUp({
      embeds: [embed],
      components: [component],
    });

    const button = await reply
      .awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 1000 * 60 * 5,
        filter: (i) =>
          i.customId.startsWith("randban-") &&
          i.user.id === interaction.user.id,
      })
      .catch(() => {
        interaction.editReply({ embeds: [embed], components: [] });
        return null;
      });

    if (!button) return;

    await interaction.editReply({ embeds: [embed], components: [] });

    if (button.customId === `randban-cancel-${member.id}`) {
      return reply.delete();
    }

    if (button.customId.startsWith("randban-confirm-")) {
      if (member && !member.bannable) {
        return button.reply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle(Errors.ErrorUser)
                .setDescription(`<@${member.id}> is not bannable.`)
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

      const confirmEmbed = safeEmbed(
        new EmbedBuilder()
          .setTitle("Grace Period")
          .setDescription(
            `You've chosen to ban <@${member.id}> (${member.user.tag}). However, they have a grace period of \`${graceTime}\` to cancel the ban. If they (or a mod) do not cancel the ban within this time, they will be banned for 24 hours.`
          )
          .setColor(EmbedColors.info)
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp(Date.now())
      );

      await button.reply({
        embeds: [confirmEmbed],
      });

      const alertEmbed = safeEmbed(
        new EmbedBuilder()
          .setTitle("Disclaimer | Ban Incoming!")
          .setDescription(
            `Hey there <@${
              member.id
            }>! One of the mods in this server has chosen to randomly pick someone to ban. You've been randomly selected!\n Luckily for you, you have until <t:${Math.floor(
              (Date.now() + timeMs) / 1000
            )}:t> to cancel your ban, just click the button below.`
          )
          .setFields([
            {
              name: "And if it's already too late...",
              value: "Don't worry, you'll be unbanned in 24 hours from now.",
            },
          ])
          .setColor(EmbedColors.info)
          .setFooter({
            text: `In ${interaction.guild!.name}`,
            iconURL: interaction.guild!.iconURL()!,
          })
          .setTimestamp(Date.now())
      );
      const cancelButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("randban-usercancel-" + member.id)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      if (!interaction.inGuild()) return;
      const inGuildMsg = await interaction.channel!.send({
        content: `<@${member.id}>`,
        embeds: [alertEmbed],
        components: [cancelButton],
      });
      try {
        await member.send({
          content: `Click here to go to the server message where you can click the cancel button: ${inGuildMsg.url}`,
          embeds: [alertEmbed],
        });
      } catch {
        // Ignore
      }

      try {
        const cancelInteraction = await inGuildMsg.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: timeMs,
          filter: (i) =>
            i.customId === "randban-usercancel-" + member.id &&
            (i.user.id === member.id ||
              i.memberPermissions!.has(
                PermissionsBitField.Flags.ManageMessages
              )),
        });

        inGuildMsg.edit({ embeds: [alertEmbed], components: [] });

        const cancelledEmbed = safeEmbed(
          new EmbedBuilder()
            .setTitle("Ban cancelled")
            .setDescription("You have successfully cancelled the ban.")
            .setColor(EmbedColors.success)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        );

        await cancelInteraction.reply({
          embeds: [cancelledEmbed],
        });
      } catch (e) {
        try {
          const ban = await banMember(
            member,
            "Random ban event, you'll be unbanned in 24 hours.",
            interaction.member as GuildMember,
            false,
            new Date(Date.now() + 1000 * 60 * 60 * 24)
          );
          if (!ban.success) {
            return inGuildMsg.reply({
              embeds: [
                safeEmbed(
                  new EmbedBuilder()
                    .setTitle(Errors.ErrorGeneric)
                    .setDescription(
                      `Something went wrong while banning <@${member.id}>.`
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
          setTimeout(async () => {
            const action = await Action.findOne({
              userID: member.id,
              actionType: "ban",
              guildID: interaction.guildId,
            }).sort({ timestamp: -1 });
            if (!action) return;
            if (action.expiresAt && action.expiresAt > new Date(Date.now()))
              return;
            await interaction.guild!.members.unban(member.id);
          }, timeMs);
          const embed = safeEmbed(
            new EmbedBuilder()
              .setTitle("Banned")
              .setDescription(
                `Banned <@${member.id}> from the random ban event! ${
                  ban.dmSent
                    ? "They have been notified."
                    : "They could not be notified."
                }`
              )
              .setFields([
                {
                  name: "Parole",
                  value: "No",
                },
                {
                  name: "Expires",
                  value: `${`<t:${Math.floor(
                    (Date.now() + timeMs!) / 1000
                  )}:f>`}`,
                },
                {
                  name: "Deleted Messages",
                  value: "No",
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
          return inGuildMsg.reply({
            embeds: [embed],
          });
        } catch (e) {
          logger.warn(`Ban command failed to ban user. ${e}`);
          return inGuildMsg.reply({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle(Errors.ErrorGeneric)
                  .setDescription(
                    "Something went wrong while banning the user."
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
      }
    }
  },
} as Command;
