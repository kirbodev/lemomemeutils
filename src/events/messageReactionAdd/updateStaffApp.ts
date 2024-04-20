import {
  APIEmbed,
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
  MessageReaction,
  Role,
  User,
} from "discord.js";
import configs from "../../config";
import { Staff } from "../../db";
import { HydratedDocument } from "mongoose";
import staffInterface, { StaffLevel } from "../../structures/staffInterface";
import EmbedColors from "../../structures/embedColors";
import setStaffLevel from "../../helpers/setStaffLevel";
import safeEmbed from "../../utils/safeEmbed";
import { dbStatus } from "../../handlers/errorHandler";

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
    await reaction.message.reactions.cache
      .get(voteType ? "❌" : "✅")
      ?.users.remove(user.id);
  }
  staffApp.decision.votes.set(user.id, voteType);
  await staffApp.save();

  // Check if the vote has passed
  const votes = [...staffApp.decision.votes.values()];
  const yesVotes = votes.filter((vote) => vote === true).length;
  const noVotes = votes.filter((vote) => vote === false).length;
  const staffRoles: Role[] = [];
  for (const role of config.staffVoteRoles ?? []) {
    const r = await reaction.message.guild!.roles.fetch(role).catch(() => null);
    if (r) staffRoles.push(r);
  }
  if (!staffRoles) return;
  const staffMembers = staffRoles.reduce(
    (acc, role) => acc + role.members.size,
    0
  );
  const majority = staffMembers > 0 ? Math.ceil(staffMembers / 2) : 9999;
  if (yesVotes >= majority) {
    // wait 5 seconds to make sure the reaction hasn't been removed
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const refreshedApp = await Staff.findOne({
      _id: staffApp._id,
      "decision.decisionAt": undefined,
    });
    if (!refreshedApp) return;
    // recalculate votes
    const refreshedVotes = [...refreshedApp.decision.votes.values()];
    const refreshedYesVotes = refreshedVotes.filter(
      (vote) => vote === true
    ).length;
    if (refreshedYesVotes < majority) return;
    staffApp.decision.decisionAt = new Date();
    staffApp.decision.approved = true;
    await setStaffLevel(staffApp, StaffLevel.Farmer);
    await staffApp.save();

    // Update the message
    const message = await reaction.message.fetch().catch(() => null);
    if (!message) return;
    const embed = message.embeds[0];
    if (!embed) return;
    const membed = new EmbedBuilder(embed as APIEmbed)
      .addFields([
        {
          name: "Decision",
          value: "Approved by majority vote",
        },
      ])
      .setColor(EmbedColors.success)
      .setTimestamp();
    await message.edit({
      components: [],
      embeds: [membed],
    });

    // Notify the user
    const userDM = await client.users.fetch(staffApp.userID).catch(() => null);
    if (userDM) {
      await userDM.send({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Staff Application Approved")
              .setDescription(
                `Your staff application for ${
                  reaction.message.guild!.name
                } has been approved!`
              )
              .setFields([
                {
                  name: "Decision",
                  value: "Approved by majority vote",
                },
                {
                  name: "Reason",
                  value: staffApp.decision.reason || "No reason provided",
                },
              ])
              .setColor(EmbedColors.success)
              .setTimestamp()
          ),
        ],
      })
      .catch(() => null);
    }

    // Notify the staff app channel
    const staffAppChannel = await reaction.message.guild.channels
      .fetch(config.staffApplicationsChannelID!)
      .catch(() => null);
    if (!staffAppChannel) return;
    await (staffAppChannel as GuildTextBasedChannel).send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Staff Application Approved")
            .setDescription(
              `<@${staffApp.userID}>'s (${staffApp.userID}) staff application has been approved!`
            )
            .setFields([
              {
                name: "Decision",
                value: "Approved by majority vote",
              },
              {
                name: "Reason",
                value: staffApp.decision.reason || "No reason provided",
              },
            ])
            .setColor(EmbedColors.success)
            .setTimestamp(Date.now())
        ),
      ],
    });
  } else if (noVotes >= majority) {
    // wait 5 seconds to make sure the reaction hasn't been removed
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const refreshedApp = await Staff.findOne({
      _id: staffApp._id,
      "decision.decisionAt": undefined,
    });
    if (!refreshedApp) return;
    // recalculate votes
    const refreshedVotes = [...refreshedApp.decision.votes.values()];
    const refreshedNoVotes = refreshedVotes.filter(
      (vote) => vote === false
    ).length;
    if (refreshedNoVotes < majority) return;
    staffApp.decision.decisionAt = new Date();
    staffApp.decision.approved = false;
    await staffApp.save();

    // Update the message
    const message = await reaction.message.fetch().catch(() => null);
    if (!message) return;
    const embed = message.embeds[0];
    if (!embed) return;
    const membed = new EmbedBuilder(embed as APIEmbed)
      .addFields([
        {
          name: "Decision",
          value: "Denied by majority vote",
        },
      ])
      .setColor(EmbedColors.error)
      .setTimestamp();
    await message.edit({
      components: [],
      embeds: [membed],
    });

    // Notify the user
    const userDM = await client.users.fetch(staffApp.userID).catch(() => null);
    if (userDM) {
      await userDM.send({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Staff Application Denied")
              .setDescription(
                `Your staff application for ${
                  reaction.message.guild!.name
                } has been denied.`
              )
              .setFields([
                {
                  name: "Decision",
                  value: "Denied by majority vote",
                },
                {
                  name: "Reason",
                  value: staffApp.decision.reason || "No reason provided",
                },
              ])
              .setColor(EmbedColors.error)
              .setTimestamp()
          ),
        ],
      })
      .catch(() => null);
    }

    // Notify the staff app channel
    const staffAppChannel = await reaction.message.guild.channels
      .fetch(config.staffApplicationsChannelID!)
      .catch(() => null);
    if (!staffAppChannel) return;
    await (staffAppChannel as GuildTextBasedChannel).send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Staff Application Denied")
            .setDescription(
              `<@${staffApp.userID}>'s (${staffApp.userID}) staff application has been denied.`
            )
            .setFields([
              {
                name: "Decision",
                value: "Denied by majority vote",
              },
              {
                name: "Reason",
                value: staffApp.decision.reason || "No reason provided",
              },
            ])
            .setColor(EmbedColors.error)
            .setTimestamp(Date.now())
        ),
      ],
    });
  }
};
