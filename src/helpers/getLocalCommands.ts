// Get commands from local directory
import type Command from '../structures/commandInterface';
import getFiles from './getFiles';
import path from 'path'
import { fileURLToPath } from 'url';
// import logger from './logger';

export default async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const commandDir = path.join(__dirname, '../commands');
    const commandFolders = await getFiles(commandDir, true);

    const commands: Command[] = [];

    for (const commandFolder of commandFolders) {
        const commandFiles = await getFiles(commandFolder, false);
        for (const commandFile of commandFiles) {
            const command = await import(`file://${commandFile}`);
            // TODO: Add command validation
            commands.push(command.default);
        }
    }

    return commands;
}