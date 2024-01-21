import path from "path";
import { fileURLToPath } from "url";
import getFiles from "../helpers/getFiles";
import type { Client } from "discord.js";
import logger from "../helpers/logger";

export default async (client: Client) => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const eventDir = path.join(__dirname, '../events');
    const eventFolders = await getFiles(eventDir, true, true);

    for (const eventFolder of eventFolders) {
        const eventFiles = await getFiles(eventFolder, false, false);
        // Sort files alphabetically to give priority in case needed
        eventFiles.sort();

        const eventName = path.basename(eventFolder);
        client.on(eventName, async (...args) => {
            for (const eventFile of eventFiles) {
                const event = await import(`../events/${eventName}/${eventFile}`);
                if (!event || !event.default) {
                    logger.warn(`Event file ${eventFile} does not export a default function`);
                    continue;
                }
                try {
                    event.default(client, ...args);
                } catch (err) {
                    logger.error(`Event file ${eventFile} errored: ${err}`);
                }
            }
        })
    }
}