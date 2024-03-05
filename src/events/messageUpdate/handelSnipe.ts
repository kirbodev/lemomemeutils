import { Client, Message } from "discord.js";
import Snipe from "../../db/index";
export default async (client: Client, oldMessage: Message, newMessage: Message) => {
  if (!newMessage.guild) return;
  if (newMessage.partial) await newMessage.fetch().catch(() => null); // Fetch if the message is partial
  // Ignore if there's no change in content or if the message now has no content
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

  await snipedMessage.save();
};
