import type { Client } from "discord.js";
import logger from "../../helpers/logger.js";

export default async (client: Client) => {
  logger.info(`Logged in as ${client.user?.username}!`);
  process.stdout.write("readySignal");

  const now = performance.now();
  const c = await client.channels.fetch("1011953546062745620");
  const time = performance.now() - now;
  c?.isTextBased() && c.send(`heartbeat ${Date.now() - time} ${process.pid}`);
  setInterval(async () => {
    c?.isTextBased() && c.send(`heartbeat ${Date.now()} ${process.pid}`);
  }, 1000);
};
