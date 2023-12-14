import type { ActionRowData, ButtonComponentData, ButtonInteraction, ChatInputCommandInteraction, GuildMemberRoleManager /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";
import { GuildMember, ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import { Warn } from "../../db/index"
import { HydratedDocument } from "mongoose";
import warnInterface from "../../structures/warnInterface";
import config from "../../../config";
import banMember from "../../helpers/banMember";
import { nanoid } from "nanoid";

const warnCooldown = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const maxWarnsBeforeBan = 3;

export default {
    name: "warn",
    description: "Warn a user and apply specific roles.",
    options: [
        {
            name: "user",
            description: "The user to warn.",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "reason",
            description: "Reason for the warning.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    devonly: false,
    testonly: true,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    slash: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const reason = interaction.options.getString("reason");

        const guild = interaction.guild!;
        const member = guild.members.cache.get(user.id) as GuildMember;

        if (!member) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorMemberNotFound)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        if (member.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorSelf)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorBot)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        if (member.roles.highest.position >= (interaction.member?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorAuthority)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }

        if (member.roles.highest.position >= (interaction.guild?.members.me?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorBotAuthority)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }

        // Check if the user has a previous warning but only return warnings that are not expired
        const warns: HydratedDocument<warnInterface>[] = await Warn.find({ userID: member.id, forceExpired: false, expiresAt: { $gte: new Date().getTime() }, severity: { $lte: 3 } });
        const currentTime = new Date().getTime();
        // Add check against accidental double warns
        const lastWarn = warns[warns.length - 1];
        if (lastWarn && lastWarn.timestamp.getTime() + 5000 > currentTime) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription("To protect against accidental double warns, please wait 5 seconds between warns.")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        const banButtonID = nanoid();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(banButtonID)
                .setLabel("Ban")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔨")
        ).toJSON() as ActionRowData<ButtonComponentData>;

        // Check if the user reached the maximum number of warnings
        let secondaryReason = "";
        let banWarn = false;
        if (warns.length === maxWarnsBeforeBan - 1) {
            banWarn = true;
            secondaryReason = "Reached maximum number of warnings."
            // TODO: Mute for 24 hours
        }
        if (member.roles.cache.has(config.paroleRoleID)) {
            banWarn = true;
            secondaryReason = "User warned while on parole."
        }

        if (warns.length < 2) {
            const warnRole = warns.length === 0 ? config.firstWarnRoleID : config.secondWarnRoleID;
            const role = guild.roles.cache.get(warnRole);

            if (role) {
                member?.roles.add(role);
            }
        }
        if (warns.length === 3) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription("This user has already reached the maximum number of warnings. They must be banned.")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                components: [
                    row
                ]
            })
        } else {
            const warn = new Warn({
                userID: member.id,
                moderatorID: interaction.user.id,
                expiresAt: new Date(currentTime + warnCooldown),
                forceExpired: false,
                withMute: false,
                severity: warns.length === 0 ? 1 : warns.length === 1 ? 2 : 3,
                reason: reason ? reason : undefined,
            });
            await warn.save();
        }

        // Remove the warn role after 3 days
        setTimeout(() => {
            const roleToRemove = warns.length === 0 ? config.firstWarnRoleID : config.secondWarnRoleID;
            const role = guild.roles.cache.get(roleToRemove);

            if (role && member) {
                member?.roles.remove(role);
            }
        }, warnCooldown);

        const embed = new EmbedBuilder()
            .setTitle("Warned")
            .setDescription(`Warned <@${member.id}> for \`${reason ? reason : "No reason provided"}\``)
            .setFields([
                {
                    name: "Severity",
                    value: `Level ${warns.length + 1}`
                }
            ])
            .setColor(EmbedColors.success)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp(Date.now())
        if (warns.length > 0) {
            embed.addFields([
                {
                    name: "Active warnings",
                    value: warns.map((warn) => `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${warn.reason} - Issued by <@${warn.moderatorID}>`).join("\n")
                }
            ]);
        }
        if (banWarn) {
            embed.addFields([
                {
                    name: "Ban warning",
                    value: `Reason: \`${secondaryReason}\`. This user must be banned.`
                }
            ]);
            embed.setColor(EmbedColors.warning);
        }
        const response = await interaction.reply({
            embeds: [
                embed
            ],
            components: banWarn ? [row] : undefined,
            allowedMentions: {
                users: [member.id]
            }
        });

        if (row && banWarn) {
            const filter = (i: ButtonInteraction) => i.customId === banButtonID && i.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages) ? true : false;
            try {
                response.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 1000 * 60 * 5 })
                    .on("collect", async (i) => {
                        const ban = await banMember(member, secondaryReason, interaction.member as GuildMember);
                        if (!ban.success) {
                            await i.reply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle(Errors.ErrorGeneric)
                                        .setDescription(`Failed to ban <@${member.id}>. This is likely because they are already banned.`)
                                        .setColor(EmbedColors.error)
                                        .setFooter({
                                            text: `Requested by ${interaction.user.tag}`,
                                            iconURL: interaction.user.displayAvatarURL()
                                        })
                                        .setTimestamp(Date.now())
                                ],
                            })
                            row!.components[0].disabled = true;
                            await interaction.editReply({
                                components: [
                                    row
                                ]
                            });
                            return;
                        }
                        try {
                            await i.reply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle("Banned")
                                        .setDescription(`Banned <@${member.id}> for \`${secondaryReason}\`. ${ban.dmSent ? "They have been notified." : "They could not be notified."}`)
                                        .setColor(EmbedColors.success)
                                        .setFooter({
                                            text: `Requested by ${interaction.user.tag}`,
                                            iconURL: interaction.user.displayAvatarURL()
                                        })
                                        .setTimestamp(Date.now())
                                ],
                            });
                            row!.components[0].disabled = true;
                            await interaction.editReply({
                                components: [
                                    row
                                ]
                            })
                        } catch (e) {
                            i.reply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle(Errors.ErrorServer)
                                        .setColor(EmbedColors.error)
                                        .setFooter({
                                            text: `Requested by ${interaction.user.tag}`,
                                            iconURL: interaction.user.displayAvatarURL()
                                        })
                                        .setTimestamp(Date.now())
                                ],
                            });
                        }
                    })


            } catch (e) {
                // If the user does not respond in 5 minutes, disable the button
                row.components[0].disabled = true;
                await interaction.editReply({
                    components: [
                        row
                    ]
                })
            }
        }
    },
} as Command;