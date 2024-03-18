import {
  APIEmbed,
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
} from "discord.js";
import Job from "../structures/jobInterface";
import { Staff } from "../db";
import { HydratedDocument } from "mongoose";
import staffInterface, { StaffLevel } from "../structures/staffInterface";
import configs from "../config";
import setStaffLevel from "../helpers/setStaffLevel";
import EmbedColors from "../structures/embedColors";
import safeEmbed from "../utils/safeEmbed";

export default {
  every: "1 hour",
  execute: async (client: Client) => {
    let count = 0;
    const votes: HydratedDocument<staffInterface>[] = await Staff.find({
      "decision.decisionAt": undefined,
      // applied more than 48 hours ago
      appliedAt: { $lte: new Date(Date.now() - 1000 * 60 * 60 * 48) },
    });
    if (!votes) return;
    for (const guildId of [...new Set(votes.map((vote) => vote.guildID))]) {
      const config = configs.get(guildId)!;
      if (!config.staffVoteRoles) continue;
      const guild = await client.guilds.fetch(config.guildID).catch(() => null);
      if (!guild) continue;

      const guildVotes = votes.filter((vote) => vote.guildID === guild.id);
      for (const vote of guildVotes) {
        count++;
        const votes = [...vote.decision.votes.values()];
        const yesVotes = votes.filter((vote) => vote === true).length;
        if (yesVotes >= 1 && yesVotes > votes.length / 2) {
          vote.decision.decisionAt = new Date();
          vote.decision.approved = true;
          await vote.save();
          await setStaffLevel(vote, StaffLevel.Farmer);
          const embed = safeEmbed(
            new EmbedBuilder()
              .setTitle("Staff Application Approved")
              .setDescription(
                `Your staff application for ${guild.name} has been approved!`
              )
              .setFields([
                {
                  name: "Decision",
                  value: "Approved by timeout",
                },
                {
                  name: "Reason",
                  value: vote.decision.reason || "No reason provided",
                },
              ])
              .setColor(EmbedColors.success)
              .setTimestamp()
          );
          const userDM = await client.users
            .fetch(vote.userID)
            .catch(() => null);
          if (userDM) {
            await userDM.send({
              embeds: [embed],
            });
          }
          try {
            const voteChannel = await guild.channels
              .fetch(config.staffVoteChannelID!)
              .catch(() => null);
            if (!voteChannel) continue;
            const message = await (
              voteChannel as GuildTextBasedChannel
            ).messages.fetch(vote.voteMessage);
            if (!message) return;
            const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
              .addFields([
                {
                  name: "Decision",
                  value: "Approved by timeout",
                },
              ])
              .setColor(EmbedColors.success)
              .setTimestamp();
            await message.edit({
              components: [],
              embeds: [membed],
            });

            const staffChannel = await guild.channels
              .fetch(config.staffApplicationsChannelID!)
              .catch(() => null);
            if (!staffChannel) continue;
            (staffChannel as GuildTextBasedChannel).send({
              embeds: [
                safeEmbed(
                  new EmbedBuilder()
                    .setTitle("Staff Application Approved")
                    .setDescription(
                      `<@${vote.userID}>'s (${vote.userID}) staff application has been approved!`
                    )
                    .setFields([
                      {
                        name: "Decision",
                        value: "Approved by timeout",
                      },
                      {
                        name: "Reason",
                        value: vote.decision.reason || "No reason provided",
                      },
                    ])
                    .setColor(EmbedColors.success)
                    .setTimestamp()
                ),
              ],
            });
          } catch (e) {
            continue;
          }
        } else {
          vote.decision.decisionAt = new Date();
          vote.decision.approved = false;
          await vote.save();
          const embed = safeEmbed(
            new EmbedBuilder()
              .setTitle("Staff Application Declined")
              .setDescription(
                `Your staff application for ${guild.name} has been declined.`
              )
              .setFields([
                {
                  name: "Decision",
                  value: "Denied by timeout",
                },
                {
                  name: "Reason",
                  value: vote.decision.reason || "No reason provided",
                },
              ])
              .setColor(EmbedColors.error)
              .setTimestamp()
          );

          const userDM = await client.users
            .fetch(vote.userID)
            .catch(() => null);
          if (userDM)
            await client.users.cache.get(vote.userID)?.send({
              embeds: [embed],
            });
          try {
            const voteChannel = await guild.channels
              .fetch(config.staffVoteChannelID!)
              .catch(() => null);
            if (!voteChannel) continue;
            const message = await (
              voteChannel as GuildTextBasedChannel
            ).messages.fetch(vote.voteMessage);
            if (!message) return;
            const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
              .addFields([
                {
                  name: "Decision",
                  value: "Denied by timeout",
                },
              ])
              .setColor(EmbedColors.error)
              .setTimestamp();
            await message.edit({
              components: [],
              embeds: [membed],
            });

            const staffChannel = await guild.channels
              .fetch(config.staffApplicationsChannelID!)
              .catch(() => null);
            if (!staffChannel) continue;
            (staffChannel as GuildTextBasedChannel).send({
              embeds: [
                safeEmbed(
                  new EmbedBuilder()
                    .setTitle("Staff Application Declined")
                    .setDescription(
                      `<@${vote.userID}> (${vote.userID})'s staff application has been declined.`
                    )
                    .setFields([
                      {
                        name: "Decision",
                        value: "Denied by timeout",
                      },
                      {
                        name: "Reason",
                        value: vote.decision.reason || "No reason provided",
                      },
                    ])
                    .setColor(EmbedColors.error)
                    .setTimestamp()
                ),
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
