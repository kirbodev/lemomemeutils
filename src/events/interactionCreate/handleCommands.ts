import { Client, Interaction, PermissionsBitField } from 'discord.js';
import { devs, testServer } from '../../../config.json';
import getLocalCommands from '../../helpers/getLocalCommands';
import logger from '../../helpers/logger';

export default async (client: Client, interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const localCommands = await getLocalCommands();
    const command = localCommands.find((command) => command.name === interaction.commandName);
    if (!command) return;
    if (command.devOnly && !devs.includes(interaction.user.id)) return interaction.reply({ content: 'This command is only available to developers', ephemeral: true });
    if (command.testOnly && interaction.guildId !== testServer) return interaction.reply({ content: 'This command is only available in the test server', ephemeral: true });
    // Check if user has any of the required permissions
    if (command.permissionsRequired && !(interaction.member?.permissions as PermissionsBitField).has(command.permissionsRequired)) return interaction.reply({ content: 'You do not have permission to use this command', ephemeral: true });
    try {
        command.slash(interaction);
    } catch (e) {
        interaction.reply({ content: 'An error occurred while executing this command', ephemeral: true });
        logger.error(e, `Error while executing command ${command.name}`);
    }
}