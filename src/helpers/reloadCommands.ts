import type { Client, ApplicationCommandOptionData } from "discord.js"
import logger from "./logger";

export default async (client: Client, command?: string) : Promise<number | undefined> => {
    try {
        const commands = await client.application?.commands.fetch();
        if (!commands) throw new Error('No commands found');
        if (command) {
            const cmd = commands.find((cmd) => cmd.name === command);
            if (!cmd) return 404;
            await cmd.delete();
            await client.application?.commands.create({
                name: cmd.name,
                description: cmd.description,
                options: cmd.options as ApplicationCommandOptionData[]
            });
            return;
        }
        for (const command of commands.values()) {
            if (command.name === 'reload') continue;
            await command.delete();
            await client.application?.commands.create({
                name: command.name,
                description: command.description,
                options: command.options as ApplicationCommandOptionData[]
            });
        }
    } catch (e) {
        logger.error(e, 'Error while reloading commands');
        return 500;
    }
}