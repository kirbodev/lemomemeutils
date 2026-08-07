import { IntentsBitField } from "discord.js";
import { client } from "../index.js";

const intents = () => new IntentsBitField(client.options.intents);

export const hasGuildMembers = (): boolean => intents().has("GuildMembers");

export const hasMessageContent = (): boolean => intents().has("MessageContent");