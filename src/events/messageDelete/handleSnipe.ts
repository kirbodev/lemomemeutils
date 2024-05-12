import { Client, Message } from "discord.js";
import snipe from "../../db/models/snipe.js";
import logger from "../../helpers/logger.js";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      return;
    }
  }
  if (!message.content && !message.attachments.size) return;

  const snipedMessage = new snipe({
    messageId: message.id,
    authorId: message.author.id,
    guildId: message.guild.id,
    channelId: message.channel.id,
    methodType: "delete",
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
