import type { ChatInputCommandInteraction } from "discord.js";

export default {
    name: 'ping',
    description: 'Pong!',
    slash(interaction: ChatInputCommandInteraction) {
        interaction.reply('Pong!');
    }
}