import getLocalCommands from "../../helpers/getLocalCommands"
import logger from "../../helpers/logger"
import type { Client } from "discord.js"
import areCommandsDifferent from "../../helpers/areCommandsDifferent"
import type { ApplicationCommandOptionData } from "discord.js"

export default async (client: Client) => {
    try {
        const localCommands = await getLocalCommands();
        const commands = await client.application?.commands.fetch();
        if (!commands) {
            logger.error('Could not fetch commands');
            return;
        }
        for (const localCommand of localCommands) {
            const { name, description, options } = localCommand;
            const existingCommand = commands.find((command) => command.name === name);

            if (existingCommand) {
                if (areCommandsDifferent(localCommand, existingCommand)) {
                    logger.info(`Updating command ${name}`);
                    await existingCommand.edit({
                        name,
                        description,
                        options: options as ApplicationCommandOptionData[]
                    });
                }
            } else {
                await client.application?.commands.create({
                    name,
                    description,
                    options: options as ApplicationCommandOptionData[]
                });
                logger.info(`Created command ${name}`);
            }
        }
    } catch (e) {
        logger.error(e, 'Error while registering commands');
    }
}