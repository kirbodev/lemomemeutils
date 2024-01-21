import type { ChatInputCommandInteraction, GuildMember, GuildMemberRoleManager, Message, User, /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";
import { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import logger from "../../helpers/logger";
import kickMember from "../../helpers/kickMember";
import configs from "../../config";

export default {
    name: "kick",
    description: "Kick a user.",
    options: [
        {
            name: "user",
            description: "The user to kick.",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "reason",
            description: "The reason for kicking the user.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    cooldown: 10000,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    contextName: "Kick user",
    slash: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply();
        const user = interaction.options.getUser("user")!;
        const reason = interaction.options.getString("reason");
        const config = configs.get(interaction.guildId!)!;

        const member = interaction.guild!.members.cache.get(user.id);

        if (!user) {
            return interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUserNotFound)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        if (!member) {
            return interaction.followUp({
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
        if (user.id === interaction.user.id) {
            return interaction.followUp({
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
        if (user.id === interaction.client.user.id) {
            return interaction.followUp({
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
                ]
            });
        }
        if (member.roles.highest.position >= (interaction.member?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.followUp({
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
            return interaction.followUp({
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
        if (!member.kickable) {
            return interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription(`<@${user.id}> is not kickable.`)
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

        try {
            const kick = await kickMember(member, interaction.member as GuildMember, reason ?? "No reason provided");
            if (!kick.success) {
                return interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(Errors.ErrorGeneric)
                            .setDescription(`Something went wrong while kicking <@${user.id}>.`)
                            .setColor(EmbedColors.error)
                            .setFooter({
                                text: `Requested by ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp(Date.now())
                    ]
                });
            }
            const embed = new EmbedBuilder()
                .setTitle("Kicked")
                .setDescription(`Kicked <@${user.id}> for \`${reason ?? "No reason provided"}\`. ${kick.dmSent ? "They have been notified." : "They could not be notified."}`)
                .setColor(EmbedColors.success)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
            if (interaction.channel !== config.logChannel) config.log({ embeds: [embed] });
            return interaction.followUp({
                embeds: [embed]
            })
        } catch (e) {
            logger.warn(`Kick command failed to kick user. ${e}`)
            return interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorGeneric)
                        .setDescription("Something went wrong while kicking the user.")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
    },
    message: async (interaction: Message, { args }) => {
        const config = configs.get(interaction.guildId!)!;
        args = args ?? [];
        const rawUser = args[0];
        let user: User;
        try {
            user = await interaction.client.users.fetch(rawUser.replace(/[<@!>]/g, ""));
        } catch (e) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUserNotFound)
                        .setDescription("Please provide a valid user.")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
            });
        }
        let reason: string | undefined = args.slice(1).join(" ");
        if (!reason) reason = undefined;

        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorMemberNotFound)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        if (user.id === interaction.author.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorSelf)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        if (user.id === interaction.client.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorBot)
                        .setDescription("What have I done wrong? :(")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
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
                        .setDescription(`<@${member.id}>'s highest role is <@&${member.roles.highest.id}> (Position: ${member.roles.highest.position}), which is higher or equal to your highest role. (Position: ${(interaction.member?.roles as GuildMemberRoleManager).highest.position})`)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                allowedMentions: {
                    users: []
                },
            });
        }
        if (member.roles.highest.position >= (interaction.guild!.members.me?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorBotAuthority)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
            });
        }
        if (!member.kickable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUser)
                        .setDescription(`<@${user.id}> is not kickable.`)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
            });
        }

        try {
            const kick = await kickMember(member, interaction.member as GuildMember, reason ?? "No reason provided");
            if (!kick.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(Errors.ErrorGeneric)
                            .setDescription(`Something went wrong while kicking <@${user.id}>.`)
                            .setColor(EmbedColors.error)
                            .setFooter({
                                text: `Requested by ${interaction.author.tag}`,
                                iconURL: interaction.author.displayAvatarURL()
                            })
                            .setTimestamp(Date.now())
                    ]
                });
            }
            const embed = new EmbedBuilder()
                .setTitle("Kicked")
                .setDescription(`Kicked <@${user.id}> for \`${reason ?? "No reason provided"}\`. ${kick.dmSent ? "They have been notified." : "They could not be notified."}`)
                .setColor(EmbedColors.success)
                .setFooter({
                    text: `Requested by ${interaction.author.tag}`,
                    iconURL: interaction.author.displayAvatarURL()
                })
                .setTimestamp(Date.now())
            if (interaction.channel !== config.logChannel) config.log({ embeds: [embed] });
            return interaction.reply({
                embeds: [embed]
            })
        } catch (e) {
            logger.warn(`Kick command failed to kick user. ${e}`)
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorGeneric)
                        .setDescription("Something went wrong while kicking the user.")
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${interaction.author.tag}`,
                            iconURL: interaction.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
    }
} as Command;