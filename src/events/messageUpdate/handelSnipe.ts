import { Client, Message } from "discord.js";
import Snipe from "../../db/index";

export default async (client: Client, oldMessage: Message, newMessage: Message) => {
  if (!newMessage.guild) return;
  if (newMessage.partial) {
    try {
      await newMessage.fetch();
    } catch (error) {
      return;
    }
  }
  if (oldMessage.content === newMessage.content || !newMessage.content) return;

  const snipedMessage = new Snipe({
    messageId: newMessage.id,
    authorId: newMessage.author.id,
    guildId: newMessage.guild.id,
    channelId: newMessage.channel.id,
    methodType: "edit",
    content: newMessage.content,
    hasMedia: newMessage.attachments.size > 0,
    timestamp: new Date(),
  });

  try {
    await snipedMessage.save();
  } catch (error) {
    console.error('Failed to save the sniped message:', error);
  }
};
