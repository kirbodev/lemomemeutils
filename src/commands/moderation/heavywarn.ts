import type { ChatInputCommandInteraction, GuildMemberRoleManager /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";
import { GuildMember, ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder, ButtonBuilder, ActionRowBuilder } from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import warnMember, { WarnResponse } from "../../helpers/warnMember";
import getBanButton from "../../helpers/handleBanButton";
import ms from "ms";
import configs from "../../config";

export default {
    name: "hw",
    description: "Heavy warn a user.",
    options: [
        {
            name: "user",
            description: "The user to heavy warn.",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "mute",
            description: "The amount of time to mute the user for.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "reason",
            description: "Reason for the warning.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    aliases: ["heavy-warn, heavywarn, hwm"],
    syntax: "prefixhw <user> [reason] || prefixhwm <user> <mute> [reason]",
    cooldown: 10000,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    contextName: "Heavy-warn a user",
    slash: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const reason = interaction.options.getString("reason");
        const time = interaction.options.getString("mute");
        const timeMs = time ? ms(time) : undefined;
        const member = interaction.guild!.members.cache.get(user.id) as GuildMember;

        const config = configs.get(interaction.guildId!)!;

        if (!member) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorMemberNotFound)
                        .setDescription(`<@${user.id}> is not a member of this server.`)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                ephemeral: true
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
                ],
                ephemeral: true
            });
        }
        if (member.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorBot)
                        .setDescription("What have I done wrong? :(")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                ephemeral: true
            });
        }
        if (time && (!timeMs || timeMs < 0 || timeMs > 3.1536E+10 /* 1 year */)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorInvalidTime)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                ephemeral: true
            });
        }
        if (member.roles.highest.position >= (interaction.member?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorAuthority)
                        .setDescription(`<@${member.id}>'s highest role is <@&${member.roles.highest.id}> (Position: ${member.roles.highest.position}), which is higher or equal to your highest role. (Position: ${(interaction.member?.roles as GuildMemberRoleManager).highest.position})`)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                allowedMentions: {
                    users: []
                },
                ephemeral: true
            });
        }

        if (member.roles.highest.position >= (interaction.guild!.members.me?.roles as GuildMemberRoleManager).highest.position) {
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
                ],
                ephemeral: true
            });
        }

        const warn = await warnMember(member, interaction.member as GuildMember, 2, reason ?? undefined);

        if (warn.response === WarnResponse.RateLimited) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorCooldown)
                        .setDescription("To prevent accidentally warning a user multiple times, there is a 10 second cooldown between warnings of the same user.")
                        .setColor(EmbedColors.info)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            })
        }

        if (warn.response === WarnResponse.isAtMaxWarns) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription("This user has already reached the maximum amount of warns.")
                        .setFields([
                            {
                                name: "Active warnings",
                                value: warn.warns.map((warn) => `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${warn.reason} - Issued by <@${warn.moderatorID}>`).join("\n")
                            }
                        ])
                        .setColor(EmbedColors.info)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            })
        }

        const embed = new EmbedBuilder()
            .setTitle("Warned")
            .setDescription(`Warned <@${member.id}> for \`${reason ?? "No reason provided"}\`. ${warn.dmSent ? "They have been notified." : "They could not be notified."}`)
            .setFields([
                {
                    name: "Severity",
                    value: `Light`
                },
                {
                    name: "Mute expires",
                    value: `${warn.muteExpires ? `<t:${Math.floor(warn.muteExpires.getTime() / 1000)}:f>` : "Not muted"}`,
                },
                {
                    name: "Reason",
                    value: `${reason ?? "No reason provided"}`
                }
            ])
            .setColor(EmbedColors.success)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp(Date.now())

        const warns = warn.warns;
        if (warns.length > 0) {
            embed.addFields([
                {
                    name: "Active warnings",
                    value: warns.map((warn) => `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${warn.reason} - Issued by <@${warn.moderatorID}>`).join("\n")
                }
            ]);
        }
        if (warn.response !== WarnResponse.Success) {
            embed.addFields([
                {
                    name: "Ban warning",
                    value: `Reason: \`${warn.response === WarnResponse.reachedMaxWarns ? "Reached the maximum amount of warns." : "Warned on parole."}\`. This user should be banned, they have been muted for 24 hours in the meanwhile.`
                }
            ]);
            embed.setColor(EmbedColors.warning);
        }
        await interaction.reply({
            embeds: [
                embed
            ],
            components: warn.response !== WarnResponse.Success ? [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        getBanButton(interaction, member.user, warn.response === WarnResponse.reachedMaxWarns ? "Reached the maximum amount of warns." : "Warned on parole.")
                    )
            ] : [],
            allowedMentions: {
                users: [member.id]
            }
        });

        config.log({ embeds: [embed], allowedMentions: { users: [member.id] } });
    },
} as Command;