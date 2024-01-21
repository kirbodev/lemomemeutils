import { Client, EmbedBuilder } from 'discord.js';
import Job from '../structures/jobInterface';
import { Staff } from '../db';
import { HydratedDocument } from 'mongoose';
import staffInterface, { StaffLevel } from '../structures/staffInterface';
import configs from '../config';
import setStaffLevel from '../helpers/setStaffLevel';
import EmbedColors from '../structures/embedColors';

export default {
    every: '5 minutes',
    execute: async (client: Client) => {
        let count = 0;
        const votes: HydratedDocument<staffInterface>[] = await Staff.find({ "decision.decisionAt": undefined });
        if (!votes) return;
        for (const guildId of [... new Set(votes.map(vote => vote.guildID))]) {
            const config = configs.get(guildId)!;
            if (!config.staffVoteRoles) continue;
            const guild = client.guilds.cache.get(config.guildID);
            if (!guild) continue;
            const staffRoles = config.staffVoteRoles.map(role => guild.roles.cache.get(role));
            if (!staffRoles) continue;
            const staffMembers = staffRoles.reduce((acc, role) => acc + (role?.members.size || 0), 0);
            const majority = Math.ceil((staffMembers || 2) / 2);

            const guildVotes = votes.filter(vote => vote.guildID === guild.id);
            for (const vote of guildVotes) {
                count++;
                const votes = [...vote.decision.votes.values()];
                const yesVotes = votes.filter(vote => vote === true).length;
                if (yesVotes >= majority) {
                    vote.decision.decisionAt = new Date();
                    vote.decision.approved = true;
                    await vote.save();
                    await setStaffLevel(vote, StaffLevel.Farmer);
                    const embed = new EmbedBuilder()
                        .setTitle("Staff Application Approved")
                        .setDescription(`Your staff application for ${guild.name} has been approved!`)
                        .setColor(EmbedColors.success)
                        .setTimestamp();
                    try {
                        await client.users.cache.get(vote.userID)?.send({
                            embeds: [embed]
                        });
                    } catch (e) {
                        continue;
                    }
                } else {
                    const timeSinceVote = Date.now() - vote.appliedAt.getTime();
                    if (timeSinceVote < 172800000 && votes.length - yesVotes < majority) continue;
                    vote.decision.decisionAt = new Date();
                    vote.decision.approved = false;
                    await vote.save();
                    const embed = new EmbedBuilder()
                        .setTitle("Staff Application Declined")
                        .setDescription(`Your staff application for ${guild.name} has been declined.`)
                        .setColor(EmbedColors.error)
                        .setTimestamp();
                    try {
                        await client.users.cache.get(vote.userID)?.send({
                            embeds: [embed]
                        });
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        return `Processed ${count} staff applications`;
    }
} as Job;