import { PermissionsBitField, type ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";

export default {
    name: 'sendapplybutton',
    description: 'Send the embed with the apply button.',
    permissionsRequired: [PermissionsBitField.Flags.Administrator],
    async slash(interaction: ChatInputCommandInteraction) {
        // Don't defer reply, modal can't be shown when deferred
        const button = new ActionRowBuilder<ButtonBuilder>()
            .setComponents([
                new ButtonBuilder()
                    .setCustomId(`apply-${interaction.guildId!}`)
                    .setLabel("Apply")
                    .setStyle(ButtonStyle.Primary)
            ])
        const embed = new EmbedBuilder()
            .setTitle("Staff Application")
            .setDescription("Click the button below to apply for staff.")
            .setColor(EmbedColors.info)
            .setTimestamp(Date.now())

        interaction.reply({
            content: "Sending...",
            ephemeral: true,
        })
        return interaction.channel!.send({
            embeds: [embed],
            components: [button]
        })
    },
} as Command;