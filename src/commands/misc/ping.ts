import { PermissionsBitField, type ChatInputCommandInteraction, /* ContextMenuCommandInteraction, */ type Message  } from "discord.js";
import type Command from "../../structures/commandInterface";

export default {
    name: 'ping',
    description: 'Pong!',
    permissionsRequired: [PermissionsBitField.Flags.ManageChannels],
    slash(interaction: ChatInputCommandInteraction) {
        interaction.reply('Pong!');
    },
    message(interaction: Message) {
        interaction.reply('Pong!');
    },
    // contextMenu(interaction: ContextMenuCommandInteraction) {
    //     interaction.reply('Pong!');
    // }
} as Command;