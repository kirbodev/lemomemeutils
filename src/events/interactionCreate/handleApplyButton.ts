import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GuildMemberRoleManager,
  Interaction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionsBitField,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import Staff from "../../db/models/staff.js";
import { nanoid } from "nanoid";
import staffInterface from "../../structures/staffInterface.js";
import { HydratedDocument } from "mongoose";
import configs from "../../config.js";
import ms from "ms";
import safeEmbed from "../../utils/safeEmbed.js";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isButton()) return;
  if (
    !interaction.customId.startsWith("apply-") &&
    !interaction.customId.startsWith("eventapply-")
  )
    return;
  const config = configs.get(interaction.guildId!)!;
  if (!config.staffApplicationsChannelID)
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorCommand)
            .setDescription(
              "This server does not have a staff applications channel set."
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

  const type = interaction.customId.startsWith("apply-") ? "staff" : "event";

  if (
    interaction.memberPermissions?.has(
      PermissionsBitField.Flags.ManageMessages
    ) &&
    type === "staff"
  )
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("Staff cannot apply for staff.")
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

  if (
    type === "event" &&
    (interaction.member?.roles as GuildMemberRoleManager).cache.has(
      config.eventStaffRole!
    )
  )
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("Event staff cannot apply for event staff.")
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

  if (
    config.staffAppRoleID &&
    !(interaction.member?.roles as GuildMemberRoleManager).cache.has(
      config.staffAppRoleID
    )
  )
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(
              `You do not have permission to apply for staff. You need <@&${config.staffAppRoleID}> to apply for staff.`
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
  const staff: HydratedDocument<staffInterface> | null = await Staff.findOne({
    userID: interaction.user.id,
    guildID: interaction.guildId!,
  });
  if (
    staff &&
    staff.appliedAt.getTime() + 1000 * 60 * 60 * 24 * 14 > Date.now()
  ) {
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorCooldown)
            .setDescription(
              `You can use this command again in ${ms(
                staff.appliedAt.getTime() +
                  1000 * 60 * 60 * 24 * 14 -
                  Date.now(),
                { long: true }
              )}`
            )
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
  const id = nanoid();
  const modal = new ModalBuilder()
    .setTitle("Staff Application")
    .setCustomId(id)
    .setComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents([
        new TextInputBuilder()
          .setLabel("What is your age?")
          .setMinLength(1)
          .setMaxLength(3)
          .setRequired(true)
          .setCustomId(`${id}-age`)
          .setStyle(TextInputStyle.Short),
      ]),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents([
        new TextInputBuilder()
          .setLabel("What is your timezone?")
          .setMinLength(1)
          .setMaxLength(50)
          .setRequired(true)
          .setCustomId(`${id}-timezone`)
          .setStyle(TextInputStyle.Short),
      ]),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents([
        new TextInputBuilder()
          .setLabel("What is your level?")
          .setMinLength(1)
          .setMaxLength(3)
          .setRequired(true)
          .setCustomId(`${id}-level`)
          .setStyle(TextInputStyle.Short),
      ]),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents([
        new TextInputBuilder()
          .setLabel("Do you have 2fa enabled? (y/n)")
          .setMinLength(1)
          .setMaxLength(1)
          .setRequired(true)
          .setCustomId(`${id}-2fa`)
          .setStyle(TextInputStyle.Short),
      ]),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents([
        new TextInputBuilder()
          .setLabel("Why do you want to be staff?")
          .setMinLength(10)
          .setMaxLength(1000)
          .setRequired(true)
          .setCustomId(`${id}-why`)
          .setStyle(TextInputStyle.Paragraph),
      ])
    );
  await interaction.showModal(modal);
  try {
    // collect the response
    const response = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 10,
      filter: (i) => i.customId === id,
    });
    const age = response.fields.getTextInputValue(`${id}-age`);
    const timezone = response.fields.getTextInputValue(`${id}-timezone`);
    const level = response.fields.getTextInputValue(`${id}-level`);
    const why = response.fields.getTextInputValue(`${id}-why`);
    const mfa = response.fields.getTextInputValue(`${id}-2fa`);

    if (!type || !age || !timezone || !level || !why || !mfa)
      return response.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("You did not fill out the form correctly.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [],
        ephemeral: true,
      });
    if (isNaN(parseInt(age)) || isNaN(parseInt(level)))
      return response.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "You did not fill out the form correctly. Age and level must be numbers."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [],
        ephemeral: true,
      });
    if (type.toLowerCase() !== "staff" && type.toLowerCase() !== "event")
      return response.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "You did not fill out the form correctly. Type must be `staff` or `event`."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [],
        ephemeral: true,
      });

    if (type.toLowerCase() === "event" && !config.eventStaffRole)
      return response.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "This server does not support event staff applications. The only type of staff you can apply for is `staff`."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [],
        ephemeral: true,
      });

    if (mfa.toLowerCase() !== "y" && mfa.toLowerCase() !== "n")
      return response.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription(
                "You did not fill out the form correctly. 2fa must be y (yes) or n (no)."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [],
        ephemeral: true,
      });
    if (mfa.toLowerCase() === "n")
      return response.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("You must have 2fa enabled to apply for staff.")
              .setFields([
                {
                  name: "How do I enable 2fa?",
                  value:
                    "Check out [this article](https://support.discord.com/hc/en-us/articles/219576828-Setting-up-Multi-Factor-Authentication).",
                },
              ])
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [],
        ephemeral: true,
      });
    // send the response
    await response.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Staff Application")
            .setDescription(
              "Thank you for applying for staff. Your application has been submitted."
            )
            .setColor(EmbedColors.success)
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
      components: [],
      ephemeral: true,
    });
    if (!response.inGuild()) return;
    response.channel?.send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Staff Application")
            .setDescription(`<@${interaction.user.id}> has applied for staff.`)
            .setFields([
              {
                name: "Type",
                value: type,
              },
              {
                name: "Age",
                value: age,
              },
              {
                name: "Timezone",
                value: timezone,
              },
              {
                name: "Level",
                value: level,
              },
              {
                name: "Reason for applying",
                value: why,
              },
            ])
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
    });
    // send the application
    const voteChannel = interaction.guild!.channels.cache.get(
      config.staffVoteChannelID!
    );
    if (!voteChannel) return;
    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Staff Application")
        .setDescription(
          `<@${interaction.user.id}> has applied for staff. **Reply** with \`r${config.prefix}<reason>\` to add a reason.`
        )
        .setFields([
          {
            name: "Type",
            value: type,
          },
          {
            name: "Age",
            value: age,
          },
          {
            name: "Timezone",
            value: timezone,
          },
          {
            name: "Level",
            value: level,
          },
          {
            name: "Reason for applying",
            value: why,
          },
        ])
        .setColor(EmbedColors.info)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp(Date.now()),
      {
        withSystemMessages: false,
      }
    );
    const bypassButtons = new ActionRowBuilder<ButtonBuilder>().setComponents([
      new ButtonBuilder()
        .setLabel("Bypass - Approve")
        .setStyle(ButtonStyle.Success)
        .setCustomId(`bypass-approve-${interaction.user.id}`),
      new ButtonBuilder()
        .setLabel("Bypass - Decline")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`bypass-decline-${interaction.user.id}`),
    ]);
    const i = await (voteChannel as TextChannel).send({
      embeds: [embed],
      components: [bypassButtons],
      content: "@everyone",
    });
    await i.react("✅");
    await i.react("❌");

    // Create the staff application or update it if it already exists
    if (staff) {
      staff.voteMessage = i.id;
      staff.appliedAt = new Date();
      staff.decision = {
        decisionAt: undefined,
        approved: undefined,
        votes: new Map<string, boolean>(),
      };
      await staff.save();
      return;
    } else {
      const newStaff = new Staff({
        userID: interaction.user.id,
        guildID: interaction.guildId!,
        appliedAt: new Date(),
        voteMessage: i.id,
        decision: {
          decisionAt: undefined,
          approved: undefined,
          votes: new Map<string, boolean>(),
        },
        type,
      });
      await newStaff.save();
    }
  } catch (err) {
    // Do nothing
  }
};
