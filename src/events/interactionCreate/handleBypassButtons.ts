import { APIEmbed, Client, EmbedBuilder, Interaction } from "discord.js";
import { devs } from "../../config";
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
    });
    console.log(type);
    if (type === "approve") {
        staff.decision.decisionAt = new Date();
        staff.decision.approved = true;
        await staff.save();
        await setStaffLevel(staff, 2)
        await interaction.followUp({
            content: "✅ Approved!",
        });
        const embed = new EmbedBuilder()
            .setTitle("Staff Application Approved")
            .setDescription(`Your staff application for ${interaction.guild!.name} has been approved!`)
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
                        value: "Approved by bypass"
                    }
                ])
                .setColor(EmbedColors.success)
                .setTimestamp();
            await message.edit({
                components: [],
                embeds: [membed]
            });
        } catch (e) {
            return;
        }
    } else if (type === "decline") {
        staff.decision.decisionAt = new Date();
        staff.decision.approved = false;
        await staff.save();
        await interaction.followUp({
            content: "✅ Denied!",
        });
        const embed = new EmbedBuilder()
            .setTitle("Staff Application Declined")
            .setDescription(`Your staff application for ${interaction.guild!.name} has been declined.`)
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
                        value: "Denied by bypass"
                    }
                ])
                .setColor(EmbedColors.error)
                .setTimestamp();
            await message.edit({
                components: [],
                embeds: [membed]
            });
        } catch (e) {
            return;
        }
    }
}