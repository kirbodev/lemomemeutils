import type { ChatInputCommandInteraction, /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";

export default {
    name: 'ping',
    description: 'Pong!',
    slash(interaction: ChatInputCommandInteraction) {
        interaction.reply('Pong!');
    },
    // message(interaction: Message) {
    //     interaction.reply('Pong!');
    // },
    // contextMenu(interaction: ContextMenuCommandInteraction) {
    //     interaction.reply('Pong!');
    // }
} as Command;