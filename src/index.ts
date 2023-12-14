import 'dotenv/config';
import { Client } from 'discord.js';
import logger from './helpers/logger';
import eventHandler from './handlers/eventHandler';
import jobHandler from './handlers/jobHandler';
import './db/index';

const client = new Client({
    intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent', 'DirectMessages', 'GuildBans', 'GuildEmojisAndStickers', 'GuildMessageReactions', 'GuildModeration', 'GuildVoiceStates']
});

// Event handling
eventHandler(client);

// Job handling
jobHandler(client);

// Error handling
client.on('error', (error) => {
    logger.error(error, 'Discord client error');
});

process.on('unhandledRejection', (error) => {
    logger.fatal(error, 'Unhandled promise rejection');
    process.exit(1);
});

if (process.env.NODE_ENV) {
    client.login(process.env.DISCORD_TOKEN_DEV);
    logger.info('Bot is running in development mode');
} else {
    client.login(process.env.DISCORD_TOKEN);
    logger.info('Bot is running in production mode');
}