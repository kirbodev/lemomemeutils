// Get commands from local directory
import type Command from "../structures/commandInterface.js";
import getFiles from "./getFiles.js";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

let cachedCommands: Command[] | undefined;
export default async function getLocalCommands() {
  if (cachedCommands) return cachedCommands;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const commandDir = path.join(__dirname, "../commands");
  const commandFolders = await getFiles(commandDir, true, true);

  const commands: Command[] = [];

  for (const commandFolder of commandFolders) {
    const commandFiles = await getFiles(commandFolder, false);
    for (const commandFile of commandFiles) {
      const command = await import(
        `../commands/${path.basename(commandFolder)}/${commandFile}`
      );
      if (
        !command.default ||
        !command.default.name ||
        !command.default.description
      ) {
        logger.warn(`Invalid command file: ${commandFile}`);
        continue;
      }
      commands.push(command.default);
    }
  }
  cachedCommands = commands;
  return commands;
}

export function getCachedCommands() {
  return cachedCommands;
}
