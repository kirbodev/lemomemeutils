import type { Client } from "discord.js";
import logger from "../../helpers/logger";

export default (client: Client) => {
  logger.info(`Logged in as ${client.user?.username}!`);
};
