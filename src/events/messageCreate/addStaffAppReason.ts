import { APIEmbed, Client, EmbedBuilder, Message } from "discord.js";
import configs from "../../config";
import { Staff } from "../../db";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  const config = configs.get(message.guild.id);
  if (!config || !config.staffVoteChannelID) return;
  if (message.channelId !== config.staffVoteChannelID) return;
  if (!message.content.startsWith(`r${config.prefix}`)) return;
  if (!message.reference) return;
  const reply = await message.fetchReference();
  if (!reply) return;
  if (reply.author.id !== client.user?.id) return;
  if (reply.embeds[0]?.data.title !== "Staff Application") return;
  const staff = await Staff.findOne({ voteMessage: reply.id });
  if (!staff) return;
  const reason = message.content.slice(2).trim();
  staff.decision.reason = reason;
  await staff.save();
  const embed = new EmbedBuilder(reply.embeds[0] as APIEmbed);
  // Find a field with the name "Reason"
  const field = embed.data.fields!.find((field) => field.name === "Reason");
  if (field) {
    embed.setFields([
      ...embed.data.fields!.filter((field) => field.name !== "Reason"),
      {
        name: "Reason",
        value: reason,
      },
    ]);
  } else {
    embed.addFields([
      {
        name: "Reason",
        value: reason,
      },
    ]);
  }
  embed.setTimestamp();
  await reply.edit({
    embeds: [embed],
  });
  await message.delete();
};
