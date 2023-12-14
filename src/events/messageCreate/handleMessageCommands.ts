import { Client, Message, PermissionsBitField, EmbedBuilder } from 'discord.js';
import getLocalCommands from '../../helpers/getLocalCommands';
import config from '../../../config';
import logger from '../../helpers/logger';
import Errors from '../../structures/errors';
import EmbedColors from '../../structures/embedColors';
import getPermissionName from '../../helpers/getPermissionName';

export default async (client: Client, message: Message) => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;
    const localCommands = await getLocalCommands();
    let command = localCommands.find((command) => command.name === message.content.slice(config.prefix.length).split(' ')[0]);
    if (!command) {
        command = localCommands.find((command) => command.aliases?.includes(message.content.slice(config.prefix.length).split(' ')[0]));
        if (!command) return;
    }
    if (command.devOnly && !config.devs.includes(message.author.id)) return message.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorDevOnly)
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ]
    });
    if (command.testOnly && message.guildId !== config.testServer) return message.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorTestOnly)
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ]
    });
    // Check if user has any of the required permissions
    if (command.permissionsRequired && !(message.member?.permissions as PermissionsBitField).has(command.permissionsRequired)) return message.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorPermissions)
                .setDescription(`You need the following permissions to use this command: ${command.permissionsRequired.map((permission) => `\`${getPermissionName(permission)}\``).join(', ')}`)
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ]
    });
    try {
        if (!command.message) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorCommand)
                        .setDescription(`The command \`${command.name}\` does not support message commands.`)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${message.author.tag}`,
                            iconURL: message.author.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            });
        }
        // Call the message command with the parameters: message and the alias used
        command.message(message, message.content.slice(config.prefix.length).split(' ')[0]);
    } catch (e) {
        message.reply('An error occurred while executing this command');
        logger.error(e, `Error while executing command ${command.name}`);
    }
}