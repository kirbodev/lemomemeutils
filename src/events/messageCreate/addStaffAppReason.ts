import { APIEmbed, Client, EmbedBuilder, Message } from "discord.js";
import configs from "../../config.js";
import Staff from "../../db/models/staff.js";
import safeEmbed from "../../utils/safeEmbed.js";

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
  embed.setFields([
    ...embed.data.fields!.filter((field) => field.name !== "Reason"),
    {
      name: "Reason",
      value: reason,
    },
  ]);
  embed.setTimestamp();
  await reply.edit({
    embeds: [safeEmbed(embed)],
  });
  await message.delete();
};
