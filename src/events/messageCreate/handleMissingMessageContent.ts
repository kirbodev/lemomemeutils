import { Client, Message } from "discord.js";
import {
  missingMessageContentReason,
  notifyMessageContentDowngrade,
} from "../../helpers/intentNotice.js";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (message.author.bot) return;
  // If the intent is present, every message delivers its content; nothing to
  // warn about.
  if (!missingMessageContentReason()) return;
  // Messages that mention the bot, reply to the bot, or come from DMs still
  // deliver their content even without the intent - no data was lost there.
  if (message.content) return;

  await notifyMessageContentDowngrade(message);
};