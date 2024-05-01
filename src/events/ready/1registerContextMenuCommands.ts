import getLocalCommands from "../../helpers/getLocalCommands.js";
import logger from "../../helpers/logger.js";
import { ApplicationCommandType, type Client } from "discord.js";

export default async (client: Client) => {
  try {
    const localCommands = (await getLocalCommands()).filter(
      (cmd) => cmd.contextMenu !== undefined,
    );
    const commands = (await client.application?.commands.fetch())?.filter(
      (cmd) => cmd.type === ApplicationCommandType.User,
    );
    if (!commands) {
      logger.error("Could not fetch commands");
      return;
    }
    for (const localCommand of localCommands) {
      if (!localCommand) continue;
      const { name, contextName } = localCommand;
      const existingCommand = commands.find(
        (command) => command.name === contextName ?? name,
      );

      if (existingCommand) {
        logger.info(`Updating contextMenu command ${name}`);
        await existingCommand.edit({
          name: contextName ?? name,
          type: ApplicationCommandType.User,
        });
      } else {
        await client.application?.commands.create({
          name: contextName ?? name,
          type: ApplicationCommandType.User,
        });
        logger.info(`Created contextMenu command ${name}`);
      }
    }
  } catch (e) {
    logger.error(e, "Error while registering commands");
  }
};
