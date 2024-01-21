import { Client, Message, PermissionFlagsBits } from "discord.js";
import configs from "../../config";
import { setTimeout } from "timers/promises";

export default async (client: Client, message: Message) => {
    if (!message.guild) return;
    const config = configs.get(message.guild.id);
    if (!config || !config.staffApplicationsChannelID) return;
    if (message.channelId !== config.staffApplicationsChannelID) return;
    if (message.member!.permissions.has(PermissionFlagsBits.ManageMessages) && !message.author.bot) return;
    try {
        if (message.author.bot) await setTimeout(3000);
        await message.delete();
    } catch (e) {
        return;
    }
};