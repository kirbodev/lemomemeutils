import { APIEmbed, Client, EmbedBuilder, GuildTextBasedChannel, Interaction } from "discord.js";
import configs, { devs } from "../../config";
import { Staff } from "../../db";
import setStaffLevel from "../../helpers/setStaffLevel";
import { HydratedDocument } from "mongoose";
import staffInterface from "../../structures/staffInterface";
import EmbedColors from "../../structures/embedColors";

export default async (client: Client, interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("bypass-")) return;
    if (!devs.includes(interaction.user.id)) return interaction.reply({
        content: "❌ You can't do that!",
        ephemeral: true
    });
    const config = configs.get(interaction.guildId!)!;
    // split after the first - and before the second - to get the type
    const type = interaction.customId.split("-").slice(1, 2).join("-");
    // split after the second - to get the user id
    const user = await client.users.fetch(interaction.customId.split("-").slice(2).join("-"));
    if (!user) return;
    await interaction.deferReply({ ephemeral: true });
    const member = await interaction.guild!.members.fetch(user.id);
    if (!member) return;
    const staff: HydratedDocument<staffInterface> | null = await Staff.findOne({ userID: user.id, guildID: interaction.guild!.id, "decision.decisionAt": undefined });
    if (!staff) return await interaction.followUp({
        content: "❌ No staff application found!",
        ephemeral: true
    });
    if (type === "approve") {
        staff.decision.decisionAt = new Date();
        staff.decision.approved = true;
        await staff.save();
        await setStaffLevel(staff, 2)
        await interaction.followUp({
            content: "✅ Approved!",
            ephemeral: true
        });
        const embed = new EmbedBuilder()
            .setTitle("Staff Application Approved")
            .setDescription(`Your staff application for ${interaction.guild!.name} has been approved!`)
            .setFields([
                {
                    name: "Decision",
                    value: `Bypass approved by ${interaction.user.tag}`
                },
                {
                    name: "Reason",
                    value: staff.decision.reason || "No reason provided"
                }
            ])
            .setColor(EmbedColors.success)
            .setTimestamp();
        try {
            await client.users.cache.get(staff.userID)?.send({
                embeds: [embed]
            });
        } catch (e) {
            return;
        }
        try {
            const message = await interaction.channel!.messages.fetch(staff.voteMessage);
            if (!message) return;
            const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
                .addFields([
                    {
                        name: "Decision",
                        value: `Bypass approved by ${interaction.user.tag}`
                    }
                ])
                .setColor(EmbedColors.success)
                .setTimestamp();
            await message.edit({
                components: [],
                embeds: [membed]
            });

            const staffChannel = interaction.guild!.channels.cache.get(config.staffApplicationsChannelID!) as GuildTextBasedChannel;
            if (!staffChannel) return;
            staffChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Staff Application Approved")
                        .setDescription(`<@${staff.userID}>'s staff application has been approved!`)
                        .setFields([
                            {
                                name: "Decision",
                                value: `Bypass approved by ${interaction.user.tag}`
                            },
                            {
                                name: "Reason",
                                value: staff.decision.reason || "No reason provided"
                            }
                        ])
                        .setColor(EmbedColors.success)
                        .setTimestamp()
                ]
            })
        } catch (e) {
            return;
        }
    } else if (type === "decline") {
        staff.decision.decisionAt = new Date();
        staff.decision.approved = false;
        await staff.save();
        await interaction.followUp({
            content: "✅ Denied!",
            ephemeral: true
        });
        const embed = new EmbedBuilder()
            .setTitle("Staff Application Declined")
            .setDescription(`Your staff application for ${interaction.guild!.name} has been declined.`)
            .setFields([
                {
                    name: "Decision",
                    value: `Bypass denied by ${interaction.user.tag}`
                },
                {
                    name: "Reason",
                    value: staff.decision.reason || "No reason provided"
                }
            ])
            .setColor(EmbedColors.error)
            .setTimestamp();
        try {
            await client.users.cache.get(staff.userID)?.send({
                embeds: [embed]
            });
        } catch (e) {
            return;
        }
        try {
            const message = await interaction.channel!.messages.fetch(staff.voteMessage);
            if (!message) return;
            const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
                .addFields([
                    {
                        name: "Decision",
                        value: `Bypass denied by ${interaction.user.tag}`
                    }
                ])
                .setColor(EmbedColors.error)
                .setTimestamp();
            await message.edit({
                components: [],
                embeds: [membed]
            });

            const staffChannel = interaction.guild!.channels.cache.get(config.staffApplicationsChannelID!) as GuildTextBasedChannel;
            if (!staffChannel) return;
            staffChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Staff Application Declined")
                        .setDescription(`<@${staff.userID}>'s staff application has been declined.`)
                        .setFields([
                            {
                                name: "Decision",
                                value: `Bypass denied by ${interaction.user.tag}`
                            },
                            {
                                name: "Reason",
                                value: staff.decision.reason || "No reason provided"
                            }
                        ])
                        .setColor(EmbedColors.error)
                        .setTimestamp()
                ]
            })
        } catch (e) {
            return;
        }
    }
}