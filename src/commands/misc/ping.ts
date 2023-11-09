import type { ChatInputCommandInteraction } from "discord.js";

export default {
    name: 'ping',
    description: 'Pong!',
    execute(interaction: ChatInputCommandInteraction) {
        interaction.reply('Pong!');
    }
}