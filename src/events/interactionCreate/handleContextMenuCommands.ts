import { Client, Interaction, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { devs, testServer } from '../../config';
import getLocalCommands from '../../helpers/getLocalCommands';
import logger from '../../helpers/logger';
import Errors from '../../structures/errors';
import EmbedColors from '../../structures/embedColors';
import getPermissionName from '../../helpers/getPermissionName';
import { maintainanceMode } from '../../config';
import { getCooldown, setCooldown } from '../../handlers/cooldownHandler';

export default async (client: Client, interaction: Interaction) => {
    if (!interaction.isContextMenuCommand()) return;
    const localCommands = await getLocalCommands();
    const command = localCommands.find((command) => command.contextName === interaction.commandName || command.name === interaction.commandName);
    if (!command) return;
    if (maintainanceMode && !devs.includes(interaction.user.id)) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorMaintainanceMode)
                .setDescription(process.env.NODE_ENV ? 'This is the testing bot, commands are not available to you.' : 'The bot is currently in maintainance mode, try again later.')
                .setColor(EmbedColors.error)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ], ephemeral: true
    });
    if (command.devOnly && !devs.includes(interaction.user.id)) return interaction.reply({
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
    if (command.testOnly && interaction.guildId !== testServer) return interaction.reply({
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
    const cooldown = getCooldown(interaction.user.id, command.name);
    if (cooldown && cooldown > Date.now()) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle(Errors.ErrorCooldown)
                .setDescription(`You can use this command again in ${Math.ceil((cooldown - Date.now()) / 1000)} seconds.`)
                .setColor(EmbedColors.info)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
        ], ephemeral: true
    });
    try {
        setCooldown(interaction.user.id, command.name);
        await command.contextMenu!(interaction);
    } catch (e) {
        const embed = new EmbedBuilder()
            .setTitle(Errors.ErrorServer)
            .setDescription('An error occurred while executing this command.')
            .setColor(EmbedColors.error)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp(Date.now())
        interaction.replied ? interaction.editReply({
            embeds: [embed],
            components: []
        }) : interaction.reply({
            embeds: [embed],
            components: [],
            ephemeral: true
        });
        logger.error(e, `Error while executing contextMenu command ${command.name}`);
    }
}