import { Client, Collection, Message } from "discord.js";
import { UserMessage } from "../../structures/userAnalyticsInterface";

export const userMessageStore = new Collection<string, UserMessage[]>();

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  const storedUserMessages =
    userMessageStore.get(`${message.author.id}-${message.guild.id}`) || [];
  const newMessage: UserMessage = {
    timestamp: new Date(),
    channelID: message.channel.id,
  };
  storedUserMessages.push(newMessage);
  userMessageStore.set(
    `${message.author.id}-${message.guild.id}`,
    storedUserMessages
  );
};
