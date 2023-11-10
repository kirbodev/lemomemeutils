import { ApplicationCommandOptionData, Interaction, GuildMember, TextChannel } from "discord.js";

const warnCooldown = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const maxWarnsBeforeBan = 3;

export default {
    name: "warn",
    description: "Warn a user and apply specific roles.",
    options: [
        {
            name: "user",
            description: "The user to warn.",
            type: "USER",
            required: true,
        },
        {
            name: "reason",
            description: "Reason for the warning.",
            type: "STRING",
            required: true,
        },
    ],
    devonly: false,
    testonly: true,
    permissionsRequired: "ManageMessages",
    execute: async (interaction: Interaction) => {
        const user = interaction.options.getUser("user")!;
        const reason = interaction.options.getString("reason")!;

        const guild = interaction.guild!;
        const member = guild.members.cache.get(user.id) as GuildMember;

        if (!member) {
            return interaction.reply("User not found in the server.");
        }

        // Check if the user has a previous warning
        const warns = member?.data.get("warns") || [];
        const currentTime = new Date().getTime();
        const lastWarnTime = warns.length > 0 ? warns[warns.length - 1].timestamp : 0;
        const timeDifference = currentTime - lastWarnTime;

        if (timeDifference < warnCooldown) {
            return interaction.reply("You can only warn a user once every 3 days.");
        }

        // Add warning and apply role based on the number of warnings
        warns.push({ reason, timestamp: currentTime });
        member?.data.set("warns", warns);

        if (warns.length === 1 || warns.length === 2) {
            const warnRole = warns.length === 1 ? "FirstWarnRoleID" : "SecondWarnRoleID";
            const role = guild.roles.cache.get(warnRole);

            if (role) {
                member?.roles.add(role);
            }
        }

        // Check if the user reached the maximum number of warnings
        if (warns.length === maxWarnsBeforeBan) {
            const banChannelId = "BanNotificationChannelID";
            const banChannel = guild.channels.cache.get(banChannelId) as TextChannel;

            if (banChannel) {
                const lastWarnedBy = warns[warns.length - 1].warnedBy;
                banChannel.send(`<@${lastWarnedBy}>: User ${user.tag} has reached 3 warnings. Please consider banning them.`);
            }
        }

        // Check and remove expired warns
        const currentTimeInSeconds = Math.floor(currentTime / 1000);
        const filteredWarns = warns.filter((warn) => (currentTimeInSeconds - Math.floor(warn.timestamp / 1000)) < warnCooldown);

        member?.data.set("warns", filteredWarns);

        // Remove the warn role after 3 days
        setTimeout(() => {
            const roleToRemove = warns.length === 1 ? "FirstWarnRoleID" : "SecondWarnRoleID";
            const role = guild.roles.cache.get(roleToRemove);

            if (role && member) {
                member?.roles.remove(role);
            }
        }, warnCooldown);

        interaction.reply(`User ${user.tag} has been warned for: ${reason}`);
    },
};