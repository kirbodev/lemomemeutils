import { Client, Message } from "discord.js";
import snipe from "../../db/models/snipe";

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
    console.error("Failed to save the sniped message:", error);
  }
};
