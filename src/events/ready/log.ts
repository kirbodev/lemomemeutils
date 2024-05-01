import type { Client } from "discord.js";
import logger from "../../helpers/logger.js";

export default async (client: Client) => {
  logger.info(`Logged in as ${client.user?.username}!`);
  process.stdout.write("readySignal");
};
