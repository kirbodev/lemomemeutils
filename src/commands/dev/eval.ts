import { EmbedBuilder, type ChatInputCommandInteraction, type ModalSubmitInteraction, ApplicationCommandOptionType } from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import { inspect } from 'util';

export default {
    name: 'eval',
    description: 'Evaluates code. Only available to developers.',
    devOnly: true,
    otpRequired: true,
    options: [
        {
            name: 'code',
            description: 'The code to evaluate.',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    async slash(ogInteraction: ChatInputCommandInteraction, interaction: ModalSubmitInteraction | ChatInputCommandInteraction) {
        // When using otpRequired, there will sometimes be the original interaction with all original data, and interaction which is the modal interaction which should be used for replying. 
        // For simplicity, we will just use the modal interaction if it exists, otherwise we will use the original interaction so don't use modal-specific methods.
        if (!interaction) interaction = ogInteraction;
        await interaction.deferReply({ ephemeral: true });
        try {
            const result = inspect(await eval(ogInteraction.options.getString('code')!), { depth: 1 });
            interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Eval | Success')
                        .setDescription(`\`\`\`js\n${result}\n\`\`\``)
                        .setColor(EmbedColors.success)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                ephemeral: true
            });
        } catch (err) {
            interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Eval | Error')
                        .setDescription(`\`\`\`js\n${err}\n\`\`\``)
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
    }
} as Command;