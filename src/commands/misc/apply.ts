import { PermissionsBitField, type ChatInputCommandInteraction, EmbedBuilder, ModalBuilder, ActionRowBuilder, ModalActionRowComponentBuilder, TextInputBuilder, TextInputStyle, TextChannel, ButtonBuilder, ButtonStyle } from "discord.js";
import type Command from "../../structures/commandInterface";
import configs from "../../config";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import { nanoid } from "nanoid";
import { Staff } from "../../db";
import { HydratedDocument } from "mongoose";
import staffInterface from "../../structures/staffInterface";
import ms from "ms";

export default {
    name: 'apply',
    description: 'Apply for staff. You can only apply once every 2 weeks.',
    permissionsRequired: [PermissionsBitField.Flags.SendMessages],
    async slash(interaction: ChatInputCommandInteraction) {
        // Don't defer reply, modal can't be shown when deferred
        const config = configs.get(interaction.guildId!)!;
        if (!config.staffApplicationsChannelID) return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(Errors.ErrorCommand)
                    .setDescription('This server does not have a staff applications channel set.')
                    .setColor(EmbedColors.error)
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp(Date.now())
            ],
            ephemeral: true
        })
        if (interaction.channelId !== config.staffApplicationsChannelID) return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(Errors.ErrorUser)
                    .setDescription('You can only apply for staff in the staff applications channel.')
                    .setColor(EmbedColors.error)
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp(Date.now())
            ],
            ephemeral: true
        })
        if (interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(Errors.ErrorUser)
                    .setDescription('Staff cannot apply for staff.')
                    .setColor(EmbedColors.error)
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp(Date.now())
            ],
            ephemeral: true
        })
        const staff: HydratedDocument<staffInterface> | null = await Staff.findOne({ userID: interaction.user.id, guildID: interaction.guildId! });
        if (staff && staff.appliedAt.getTime() + (1000 * 60 * 60 * 24 * 14) > Date.now()) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorCooldown)
                        .setDescription(`You can use this command again in ${ms(staff.appliedAt.getTime() + (1000 * 60 * 60 * 24 * 14) - Date.now(), { long: true })}`)
                        .setColor(EmbedColors.info)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                ephemeral: true
            });
        }
        const id = nanoid();
        const modal = new ModalBuilder()
            .setTitle('Staff Application')
            .setCustomId(id)
            .setComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                    .setComponents([
                        new TextInputBuilder()
                            .setLabel("What is your age?")
                            .setMinLength(1)
                            .setMaxLength(3)
                            .setRequired(true)
                            .setCustomId(`${id}-age`)
                            .setStyle(TextInputStyle.Short),
                    ]),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                    .setComponents([
                        new TextInputBuilder()
                            .setLabel("What is your timezone?")
                            .setMinLength(1)
                            .setMaxLength(50)
                            .setRequired(true)
                            .setCustomId(`${id}-timezone`)
                            .setStyle(TextInputStyle.Short),
                    ]),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                    .setComponents([
                        new TextInputBuilder()
                            .setLabel("What is your level?")
                            .setMinLength(1)
                            .setMaxLength(3)
                            .setRequired(true)
                            .setCustomId(`${id}-level`)
                            .setStyle(TextInputStyle.Short),
                    ]),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                    .setComponents([
                        new TextInputBuilder()
                            .setLabel("Why do you want to be staff?")
                            .setMinLength(10)
                            .setMaxLength(1000)
                            .setRequired(true)
                            .setCustomId(`${id}-why`)
                            .setStyle(TextInputStyle.Paragraph),
                    ])
            )
        await interaction.showModal(modal);
        try {
            // collect the response
            const response = await interaction.awaitModalSubmit({
                time: 1000 * 60 * 5,
                filter: (i) => i.customId === id,
            });
            const age = response.fields.getTextInputValue(`${id}-age`);
            const timezone = response.fields.getTextInputValue(`${id}-timezone`);
            const level = response.fields.getTextInputValue(`${id}-level`);
            const why = response.fields.getTextInputValue(`${id}-why`);

            if (!age || !timezone || !level || !why) return response.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription('You did not fill out the form correctly.')
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                components: []
            });
            if (isNaN(parseInt(age)) || isNaN(parseInt(level))) return response.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription('You did not fill out the form correctly. Age and level must be numbers.')
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                components: []
            });
            // send the response
            await response.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Staff Application')
                        .setDescription('Thank you for applying for staff. Your application has been submitted.')
                        .setColor(EmbedColors.success)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                components: [],
                ephemeral: true
            });
            // send the application
            const voteChannel = interaction.guild!.channels.cache.get(config.staffVoteChannelID!);
            if (!voteChannel) return;
            const embed = new EmbedBuilder()
                .setTitle('Staff Application')
                .setDescription(`<@${interaction.user.id}> has applied for staff.`)
                .setFields([
                    {
                        name: 'Age',
                        value: age
                    },
                    {
                        name: 'Timezone',
                        value: timezone
                    },
                    {
                        name: 'Level',
                        value: level
                    },
                    {
                        name: 'Reason for applying',
                        value: why
                    }
                ])
                .setColor(EmbedColors.info)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now());
            const bypassButtons = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setLabel("Bypass - Approve")
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(`bypass-approve-${interaction.user.id}`),
                    new ButtonBuilder()
                        .setLabel("Bypass - Decline")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`bypass-decline-${interaction.user.id}`)
                ])
            const i = await (voteChannel as TextChannel).send({
                embeds: [
                    embed
                ],
                components: [
                    bypassButtons
                ],
                content: "@everyone"
            });
            await i.react('✅');
            await i.react('❌');

            // Create the staff application or update it if it already exists
            if (staff) {
                staff.voteMessage = i.id;
                staff.appliedAt = new Date();
                staff.decision = {
                    decisionAt: undefined,
                    approved: undefined,
                    votes: new Map<string, boolean>()
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
                        votes: new Map<string, boolean>()
                    }
                });
                await newStaff.save();
            }
        } catch (err) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorCommand)
                        .setDescription('You did not respond in time.')
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                components: []
            });
        }
    },
} as Command;