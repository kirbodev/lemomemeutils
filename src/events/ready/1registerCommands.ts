import getLocalCommands from "../../helpers/getLocalCommands";
import logger from "../../helpers/logger";
import { ApplicationCommandType, type Client } from "discord.js";
import type { ApplicationCommandOptionData } from "discord.js";

export default async (client: Client) => {
    try {
        const commands = (await client.application?.commands.fetch())?.filter(cmd => cmd.type === ApplicationCommandType.ChatInput);
        if (!commands) {
            logger.error('Could not fetch commands');
            return;
        }
        const localCommands = await getLocalCommands();
        for (const localCommand of localCommands) {
            if (!localCommand) continue;
            const { name, description, options } = localCommand;
            const existingCommand = commands.find((command) => command.name === name);
            if (existingCommand) {
                await existingCommand.edit({ name, description, options: options as ApplicationCommandOptionData[], dmPermission: false, defaultMemberPermissions: localCommand.permissionsRequired || [] });
                logger.info(`Updated command ${name}`);
            } else {
                await client.application?.commands.create({ name, description, options: options as ApplicationCommandOptionData[], dmPermission: false, defaultMemberPermissions: localCommand.permissionsRequired || [] });
                logger.info(`Created command ${name}`);
            }
        }
        // Delete commands that are not in the local commands
        for (const command of commands) {
            if (!command) continue;
            const localCommand = localCommands.find((cmd) => cmd.name === command[1].name);
            if (!localCommand) {
                await command[1].delete();
                logger.info(`Deleted command ${command[1].name}`);
            }
        }
    } catch (e) {
        logger.error(e, 'Error while registering commands');
    }
}