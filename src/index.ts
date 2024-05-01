import "dotenv/config";
import { Client, Partials } from "discord.js";
import logger from "./helpers/logger.js";
import eventHandler from "./handlers/eventHandler.js";

const client = new Client({
  intents: [
    "Guilds",
    "GuildMessages",
    "GuildMembers",
    "MessageContent",
    "DirectMessages",
    "GuildBans",
    "GuildEmojisAndStickers",
    "GuildMessageReactions",
    "GuildModeration",
    "GuildVoiceStates",
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.User,
    Partials.Reaction,
  ],
});

await eventHandler(client);

// Error handling
client.on("error", (error) => {
  logger.error(error, "Discord client error");
});

process.on("unhandledRejection", (error) => {
  logger.fatal(error, "Unhandled promise rejection");
});

process.stdin.on("data", (data) => {
  if (data.toString().trim() === "exit") {
    logger.info("Received exit command, exiting...");
    process.exit(0);
  }
});

if (process.env.NODE_ENV) {
  client.login(process.env.DISCORD_TOKEN_DEV);
  logger.info("Bot is running in development mode");
} else {
  client.login(process.env.DISCORD_TOKEN);
  logger.info("Bot is running in production mode");
}

export { client };
