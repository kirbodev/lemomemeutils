import 'dotenv/config';
import { Client } from 'discord.js';
import logger from './helpers/logger';
import eventHandler from './handlers/eventHandler';
import './db/index';

const client = new Client({
    intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent', 'DirectMessages', 'GuildBans', 'GuildEmojisAndStickers', 'GuildMessageReactions', 'GuildModeration', 'GuildVoiceStates']
});

// Event handling
eventHandler(client);

// Error handling
client.on('error', (error) => {
    logger.error(error, 'Discord client error');
});

process.on('unhandledRejection', (error) => {
    logger.fatal(error, 'Unhandled promise rejection');
    process.exit(1);
});

client.login(process.env.DISCORD_TOKEN);