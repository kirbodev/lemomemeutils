import { Client, Message } from "discord.js";
import Snipe from "../../db/index";

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

  const snipedMessage = new Snipe({
    messageId: message.id,
    authorId: message.author.id,
    guildId: message.guild.id,
    channelId: message.channel.id,
    methodType: "delete",
    content: message.content,
    hasMedia: message.attachments.size > 0,
    timestamp: new Date(),
  });

  try {
    await snipedMessage.save();
  } catch (error) {
    console.error('Failed to save the sniped message:', error);
  }
};
