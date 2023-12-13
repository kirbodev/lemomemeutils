import { Client, Interaction, PermissionsBitField, EmbedBuilder } from 'discord.js';
import config from '../../../config';
import getLocalCommands from '../../helpers/getLocalCommands';
import logger from '../../helpers/logger';
import Errors from '../../structures/errors';
import EmbedColors from '../../structures/embedColors';
import getPermissionName from '../../helpers/getPermissionName';

export default async (client: Client, interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const localCommands = await getLocalCommands();
    const command = localCommands.find((command) => command.name === interaction.commandName);
    if (!command) return;
    if (command.devOnly && !config.devs.includes(interaction.user.id)) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorDevOnly)
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ], ephemeral: true
    });
    if (command.testOnly && interaction.guildId !== config.testServer) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorTestOnly)
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ], ephemeral: true
    });
    // Check if user has any of the required permissions
    if (command.permissionsRequired && !(interaction.member?.permissions as PermissionsBitField).has(command.permissionsRequired)) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorPermissions)
                .setDescription(`You need the following permissions to use this command: ${command.permissionsRequired.map((permission) => `\`${getPermissionName(permission)}\``).join(', ')}`)
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ], ephemeral: true
    });
    try {
        command.slash(interaction);
    } catch (e) {
        interaction.reply({ content: 'An error occurred while executing this command', ephemeral: true });
        logger.error(e, `Error while executing command ${command.name}`);
    }
}