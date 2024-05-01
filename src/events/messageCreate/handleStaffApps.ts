import { Client, Message } from "discord.js";
import configs from "../../config.js";
import kv from "../../db/models/kv.js";
import { HydratedDocument } from "mongoose";
import kvInterface from "../../structures/kvInterface.js";
import { dbStatus } from "../../handlers/errorHandler.js";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  const config = configs.get(message.guild.id);
  if (!config || !config.staffApplicationsChannelID) return;
  if (message.channel.id !== config.staffApplicationsChannelID) return;
  if (message.reference && message.author.id === message.client.user.id) return;
  if (
    message.components[0]?.components[0]?.customId ===
    `apply-${message.guildId}`
  )
    return;
    if (dbStatus) return;
  const applyMessageId: HydratedDocument<kvInterface> | null = await kv.findOne(
    { key: `staffAppsMessage-${message.guildId}` }
  );
  if (!applyMessageId) return;
  const applyMessage = await message.channel.messages
    .fetch(applyMessageId.value)
    .catch(() => null);
  if (!applyMessage || applyMessage.author.id !== message.client.user.id)
    return;
  const msg = await message.channel.send({
    content: applyMessage.content,
    embeds: applyMessage.embeds,
    components: applyMessage.components,
  });
  await applyMessage.delete().catch(() => null);

  applyMessageId.value = msg.id;
  await applyMessageId.save();
};
