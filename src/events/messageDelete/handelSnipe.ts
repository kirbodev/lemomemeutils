import { Client, Message } from "discord.js";
import snipe from "../../db/index";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (message.partial) await message.fetch().catch(() => null); // Fetch if the message is partial
  if (!message.content && !message.attachments.size) return; // Ignore if there's no content or attachments

  const snipedMessage = new SnipedMessage({
    messageId: message.id,
    authorId: message.author.id,
    guildId: message.guild.id,
    channelId: message.channel.id,
    methodType: "delete",
    content: message.content,
    hasMedia: message.attachments.size > 0,
    timestamp: new Date(),
  });

  await snipedMessage.save();
};
