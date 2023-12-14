import type { ChatInputCommandInteraction, GuildMember, /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";
import { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import { Action } from "../../db/index"
import logger from "../../helpers/logger";
import ms from "ms";
import banMember from "../../helpers/banMember";

export default {
    name: "ban",
    description: "Ban a user and optionally apply parole.",
    options: [
        {
            name: "user",
            description: "The user to ban.",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "time",
            description: "The amount of time to ban the user for. By default, this is permanent. Format: `1d 2h 3m 4s`",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "parole",
            description: "Whether or not to apply parole to the user.",
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        },
        {
            name: "reason",
            description: "The reason for banning the user.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    devonly: false,
    testonly: true,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    slash: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const time = interaction.options.getString("time");
        const parole = interaction.options.getBoolean("parole") ?? false;
        const reason = interaction.options.getString("reason");

        const timeMs = time ? ms(time) : undefined;

        if (!user) {
            return interaction.reply({
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
                ]
            });
        }

        if (user.id === interaction.user.id) {
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
        if (user.id === interaction.client.user.id) {
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



        try {
            const ban = await banMember(interaction.guild!.members.cache.get(user.id)!, reason ?? "No reason provided", interaction.member! as GuildMember, parole, timeMs ? new Date(Date.now() + timeMs) : undefined);
            if (!ban.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(Errors.ErrorUserBanned)
                            .setDescription(`<@${user.id}> is already banned.`)
                            .setColor(EmbedColors.error)
                            .setFooter({
                                text: `Requested by ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp(Date.now())
                    ]
                });
            }
            if (timeMs) {
                setTimeout(async () => {
                    const action = await Action.findOne({ userID: user.id, actionType: "ban" }).sort({ timestamp: -1 });
                    if (!action) return;
                    if (action.expiresAt && action.expiresAt > new Date(Date.now())) return;
                    await interaction.guild!.members.unban(user.id);
                }, timeMs);
            }
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("Banned")
                    .setDescription(`Banned <@${user.id}> for \`${reason ?? "No reason provided"}\`. ${ban.dmSent ? "They have been notified." : "They could not be notified."}`)
                    .setFields([
                        {
                            name: "Parole",
                            value: `${parole ? "Yes" : "No"}`,
                        },
                        {
                            name: "Expires",
                            value: `${time ? time : "Never"}`,
                        },
                    ])
                    .setColor(EmbedColors.success)
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp(Date.now())]
            })
        } catch (e) {
            logger.warn(`Ban command failed to ban user. ${e}`)
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorGeneric)
                        .setDescription("Something went wrong while banning the user.")
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
} as Command;