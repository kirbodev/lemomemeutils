import { ApplicationCommandOptionType, type ChatInputCommandInteraction, /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import reloadCommands from "../../helpers/reloadCommands";
import Command from "../../structures/commandInterface";

export default {
    name: 'reload',
    description: 'Reloads slash commands to remove ghost commands/broken commands.',
    devOnly: true,
    options: [
        {
            name: "command",
            description: "The command to reload.",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    async slash(interaction: ChatInputCommandInteraction) {
        const command = interaction.options.getString('command');
        const reloaded = await reloadCommands(interaction.client, command ? command : undefined);
        if (reloaded === 500) {
            interaction.reply({
                content: "There was an error while reloading commands. Check the logs for more information.",
                ephemeral: true
            });
            return;
        }
        if (reloaded === 404) {
            interaction.reply({
                content: "That command does not exist.",
                ephemeral: true
            });
            return;
        }
        interaction.reply({
            content: "Reloaded commands. A restart may be required for changes to fully take effect.",
            ephemeral: true
        });
    },
    // message(interaction: Message) {
    //     interaction.reply('Pong!');
    // },
    // contextMenu(interaction: ContextMenuCommandInteraction) {
    //     interaction.reply('Pong!');
    // }
} as Command;