import { Client, Message } from "discord.js";
import configs from "../../config";
import kv from "../../db/models/kv";
import { HydratedDocument } from "mongoose";
import kvInterface from "../../structures/kvInterface";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  const config = configs.get(message.guild.id);
  if (!config || !config.staffApplicationsChannelID) return;
  if (message.channelId !== config.staffApplicationsChannelID) return;
  if (message.interaction || message.reference) return;
  if (
    message.components[0]?.components[0]?.customId ===
    `apply-${message.guildId}`
  )
    return;
  const applyMessageId: HydratedDocument<kvInterface> | null = await kv.findOne(
    { key: `staffAppsMessage-${message.guildId}` }
  );
  if (!applyMessageId) return;
  const applyMessage = await message.channel.messages
    .fetch(applyMessageId.value)
    .catch(() => null);
  if (!applyMessage) return;
  const msg = await message.channel.send({
    content: applyMessage.content,
    embeds: applyMessage.embeds,
    components: applyMessage.components,
  });
  await applyMessage.delete().catch(() => null);

  applyMessageId.value = msg.id;
  await applyMessageId.save();
};
