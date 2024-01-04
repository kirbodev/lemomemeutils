import { PermissionsBitField, type ChatInputCommandInteraction, type ContextMenuCommandInteraction, type Message } from "discord.js";
import type Command from "../../structures/commandInterface";

export default {
    name: 'ping',
    description: 'Pong!',
    contextName: 'Ping!',
    cooldown: 30000,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    slash(interaction: ChatInputCommandInteraction) {
        interaction.reply('Pong!');
    },
    message(interaction: Message) {
        interaction.reply('Pong!');
    },
    contextMenu(interaction: ContextMenuCommandInteraction) {
        interaction.reply('Pong!');
    }
} as Command;