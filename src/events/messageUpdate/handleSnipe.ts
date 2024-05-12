import { Client, Message } from "discord.js";
import snipe from "../../db/models/snipe.js";
import logger from "../../helpers/logger.js";

export default async (
  client: Client,
  oldMessage: Message,
  message: Message
) => {
  if (!message.guild) return;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      return;
    }
  }
  if (oldMessage.content === message.content || !message.content) return;

  const snipedMessage = new snipe({
    messageId: message.id,
    authorId: message.author.id,
    guildId: message.guild.id,
    channelId: message.channel.id,
    methodType: "edit",
    content:
      message.content +
      (message.attachments.size ? "\n" + message.attachments.map((a) => `[${a.name}](${a.url})`).join("\n") :
        ""),
  });

  try {
    await snipedMessage.save();
  } catch (error) {
    logger.error("Failed to save the sniped message:", error);
  }
};
