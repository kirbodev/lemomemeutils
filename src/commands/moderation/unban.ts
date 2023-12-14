import type { ChatInputCommandInteraction, /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";
import { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } from "discord.js";
import EmbedColors from "../../structures/embedColors";
import Errors from "../../structures/errors";
import { Action } from "../../db/index"
import logger from "../../helpers/logger";

export default {
    name: "unban",
    description: "Unban a user and optionally apply parole.",
    options: [
        {
            name: "user",
            description: "The user ID to unban.",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "parole",
            description: "Whether or not to apply parole to the user.",
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        },
        {
            name: "reason",
            description: "The reason for unbanning the user.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    devonly: false,
    testonly: true,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    slash: async (interaction: ChatInputCommandInteraction) => {
        const userID = interaction.options.getString("user")!;
        const parole = interaction.options.getBoolean("parole") ?? false;
        const reason = interaction.options.getString("reason");

        const user = await interaction.client.users.fetch(userID);

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
            try {
                await interaction.guild?.members.unban(user, reason ?? "No reason provided")
            } catch (e) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(Errors.ErrorUserNotBanned)
                            .setDescription(`${interaction.guild?.members.cache.has(user.id) ? `<@${user.id}> is not banned and is in the server.` : `<@${user.id}> is not banned and is not in the server.`}`)
                            .setColor(EmbedColors.error)
                            .setFooter({
                                text: `Requested by ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp(Date.now())
                    ]
                });
            }
            await Action.findOneAndUpdate({ userID: user.id, actionType: "ban" }, { forceExpired: true }).sort({ timestamp: -1 });
            const action = new Action({
                userID: user.id,
                moderatorID: interaction.user.id,
                actionType: "unban",
                reason: reason ?? "No reason provided",
                withParole: parole,
            })
            await action.save();
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("Unbanned")
                    .setDescription(`Unbanned <@${user.id}> for \`${reason ? reason : "No reason provided"}\``)
                    .setFields([
                        {
                            name: "Parole",
                            value: `${parole ? "Yes" : "No"}`,
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
            logger.warn(`Unban command failed to unban user. ${e}`)
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorGeneric)
                        .setDescription("Something went wrong while unbanning the user.")
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