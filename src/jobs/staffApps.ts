import {
  APIEmbed,
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
  Role,
} from "discord.js";
import Job from "../structures/jobInterface";
import { Staff } from "../db";
import { HydratedDocument } from "mongoose";
import staffInterface, { StaffLevel } from "../structures/staffInterface";
import configs from "../config";
import setStaffLevel from "../helpers/setStaffLevel";
import EmbedColors from "../structures/embedColors";

export default {
  every: "5 minutes",
  execute: async (client: Client) => {
    let count = 0;
    const votes: HydratedDocument<staffInterface>[] = await Staff.find({
      "decision.decisionAt": undefined,
    });
    if (!votes) return;
    for (const guildId of [...new Set(votes.map((vote) => vote.guildID))]) {
      const config = configs.get(guildId)!;
      if (!config.staffVoteRoles) continue;
      const guild = client.guilds.cache.get(config.guildID);
      if (!guild) continue;
      const staffRoles: Role[] = [];
      try {
        config.staffVoteRoles.forEach(async (role) => {
          const r = await guild.roles.fetch(role);
          if (r) staffRoles.push(r);
        });
      } catch (e) {
        continue;
      }
      if (!staffRoles) continue;
      const staffMembers = staffRoles.reduce(
        (acc, role) => acc + (role.members.size || 0),
        0,
      );
      const majority = Math.ceil((staffMembers || 9999999) / 2);

      const guildVotes = votes.filter((vote) => vote.guildID === guild.id);
      for (const vote of guildVotes) {
        count++;
        const votes = [...vote.decision.votes.values()];
        const yesVotes = votes.filter((vote) => vote === true).length;
        if (
          yesVotes >= majority ||
          (vote.appliedAt.getTime() + 1000 * 60 * 60 * 48 < Date.now() &&
            yesVotes >= 1 &&
            yesVotes > votes.length / 2)
        ) {
          vote.decision.decisionAt = new Date();
          vote.decision.approved = true;
          await vote.save();
          await setStaffLevel(vote, StaffLevel.Farmer);
          const embed = new EmbedBuilder()
            .setTitle("Staff Application Approved")
            .setDescription(
              `Your staff application for ${guild.name} has been approved!`,
            )
            .setFields([
              {
                name: "Decision",
                value: "Approved by majority vote",
              },
              {
                name: "Reason",
                value: vote.decision.reason || "No reason provided",
              },
            ])
            .setColor(EmbedColors.success)
            .setTimestamp();
          try {
            await client.users.cache.get(vote.userID)?.send({
              embeds: [embed],
            });
          } catch (e) {
            // Do nothing
          }
          try {
            const message = await (
              guild.channels.cache.get(
                config.staffVoteChannelID!,
              ) as GuildTextBasedChannel
            )?.messages.fetch(vote.voteMessage);
            if (!message) return;
            const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
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

            const staffChannel = guild.channels.cache.get(
              config.staffApplicationsChannelID!,
            ) as GuildTextBasedChannel;
            if (!staffChannel) continue;
            staffChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Staff Application Approved")
                  .setDescription(
                    `<@${vote.userID}>'s (${vote.userID}) staff application has been approved!`,
                  )
                  .setFields([
                    {
                      name: "Decision",
                      value: "Approved by majority vote",
                    },
                    {
                      name: "Reason",
                      value: vote.decision.reason || "No reason provided",
                    },
                  ])
                  .setColor(EmbedColors.success)
                  .setTimestamp(),
              ],
            });
          } catch (e) {
            continue;
          }
        } else {
          const timeSinceVote = Date.now() - vote.appliedAt.getTime();
          if (timeSinceVote < 172800000) continue;
          vote.decision.decisionAt = new Date();
          vote.decision.approved = false;
          await vote.save();
          const embed = new EmbedBuilder()
            .setTitle("Staff Application Declined")
            .setDescription(
              `Your staff application for ${guild.name} has been declined.`,
            )
            .setFields([
              {
                name: "Decision",
                value:
                  votes.length - yesVotes >= majority
                    ? "Denied by majority vote"
                    : "Denied by timeout",
              },
              {
                name: "Reason",
                value: vote.decision.reason || "No reason provided",
              },
            ])
            .setColor(EmbedColors.error)
            .setTimestamp();
          try {
            await client.users.cache.get(vote.userID)?.send({
              embeds: [embed],
            });
          } catch (e) {
            // Do nothing
          }
          try {
            const message = await (
              guild.channels.cache.get(
                config.staffVoteChannelID!,
              ) as GuildTextBasedChannel
            )?.messages.fetch(vote.voteMessage);
            if (!message) return;
            const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
              .addFields([
                {
                  name: "Decision",
                  value:
                    votes.length - yesVotes >= majority
                      ? "Denied by majority vote"
                      : "Denied by timeout",
                },
              ])
              .setColor(EmbedColors.error)
              .setTimestamp();
            await message.edit({
              components: [],
              embeds: [membed],
            });

            const staffChannel = guild.channels.cache.get(
              config.staffApplicationsChannelID!,
            ) as GuildTextBasedChannel;
            if (!staffChannel) continue;
            staffChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Staff Application Declined")
                  .setDescription(
                    `<@${vote.userID}> (${vote.userID})'s staff application has been declined.`,
                  )
                  .setFields([
                    {
                      name: "Decision",
                      value:
                        votes.length - yesVotes >= majority
                          ? "Denied by majority vote"
                          : "Denied by timeout",
                    },
                    {
                      name: "Reason",
                      value: vote.decision.reason || "No reason provided",
                    },
                  ])
                  .setColor(EmbedColors.error)
                  .setTimestamp(),
              ],
            });
          } catch (e) {
            continue;
          }
        }
      }
    }
    return `Processed ${count} staff applications`;
  },
} as Job;
