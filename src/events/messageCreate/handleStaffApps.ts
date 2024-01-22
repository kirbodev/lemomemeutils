import { Client, Message, PermissionFlagsBits } from "discord.js";
import configs from "../../config";
import { setTimeout } from "timers/promises";

export default async (client: Client, message: Message) => {
    if (!message.guild) return;
    const config = configs.get(message.guild.id);
    if (!config || !config.staffApplicationsChannelID) return;
    if (message.channelId !== config.staffApplicationsChannelID) return;
    if (message.embeds[0]?.data.title === "Staff Application") return;
    let dontDelete = false;
    if (message.member!.permissions.has(PermissionFlagsBits.ManageMessages) && !message.author.bot) dontDelete = true;
    if (message.author.bot && message.embeds[0]?.data.title?.startsWith("Staff Application")) dontDelete = true;

    const msg = await message.channel.messages.fetch({ limit: 2 });
    const lastMessage = msg.last();
    if (lastMessage?.embeds[0]?.data.title === "Staff Application") {
        await message.channel.send({
            content: lastMessage.content,
            embeds: lastMessage.embeds,
            components: lastMessage.components
        })
        await lastMessage.delete();
    }

    if (dontDelete) return;
    try {
        if (message.author.bot) await setTimeout(3000);
        await message.delete();
    } catch (e) {
        return;
    }
};