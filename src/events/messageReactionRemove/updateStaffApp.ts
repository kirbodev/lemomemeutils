import { Client, MessageReaction, User } from "discord.js";
import configs from "../../config.js";
import Staff from "../../db/models/staff.js";
import { HydratedDocument } from "mongoose";
import staffInterface from "../../structures/staffInterface.js";
import { dbStatus } from "../../handlers/errorHandler.js";

export default async (
  client: Client,
  reaction: MessageReaction,
  user: User
) => {
  if (!reaction.message || !reaction.message.guild) return;
  if (user.bot) return;
  const config = configs.get(reaction.message.guild!.id);
  if (!config || !config.staffVoteChannelID) return;
  if (reaction.message.channelId !== config.staffVoteChannelID) return;
  if (reaction.emoji.name !== "✅" && reaction.emoji.name !== "❌") return;
  if (dbStatus) return;
  const staffApp: HydratedDocument<staffInterface> | null = await Staff.findOne(
    {
      voteMessage: reaction.message.id,
      guildID: reaction.message.guild.id,
      "decision.decisionAt": undefined,
    }
  );
  if (!staffApp) return;
  const voteType = reaction.emoji.name === "✅";
  const vote = staffApp.decision.votes.get(user.id);
  if (vote !== undefined && vote === voteType) {
    staffApp.decision.votes.delete(user.id);
  }
  await staffApp.save();
};
