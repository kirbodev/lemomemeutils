import type { ChatInputCommandInteraction, GuildMemberRoleManager, /* ContextMenuCommandInteraction, Message */ } from "discord.js";
import type Command from "../../structures/commandInterface";
import { GuildMember, TextChannel, ApplicationCommandOptionType, PermissionsBitField } from "discord.js";
import { Warn } from "../../db/index"
import { HydratedDocument } from "mongoose";
import warnInterface from "../../structures/warnInterface";
import config from "../../../config.json";

const warnCooldown = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const maxWarnsBeforeBan = 3;

export default {
    name: "warn",
    description: "Warn a user and apply specific roles.",
    options: [
        {
            name: "user",
            description: "The user to warn.",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "reason",
            description: "Reason for the warning.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    devonly: false,
    testonly: true,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    slash: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const reason = interaction.options.getString("reason");

        const guild = interaction.guild!;
        const member = guild.members.cache.get(user.id) as GuildMember;

        if (!member) {
            return interaction.reply("User not found in the server.");
        }
        if (member.id === interaction.user.id) {
            return interaction.reply("You cannot warn yourself.");
        }
        if (member.id === interaction.client.user.id) {
            return interaction.reply("You cannot warn me.");
        }
        if (member.roles.highest.position >= (interaction.member?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.reply("You cannot warn a user with a higher or equal role.");
        }

        if (member.roles.highest.position >= (interaction.guild?.members.me?.roles as GuildMemberRoleManager).highest.position) {
            return interaction.reply("I cannot warn a user with a higher or equal role.");
        }

        // Check if the user has a previous warning but only return warnings that are not expired
        const warns: HydratedDocument<warnInterface>[] = await Warn.find({ userID: member.id, forceExpired: false, expiresAt: { $gte: new Date().getTime() }, severity: { $lte: 2 } });
        const currentTime = new Date().getTime();
        // Add check so that the user cannot be warned more than once in 3 days
        const lastWarn = warns[warns.length - 1];
        if (lastWarn && (currentTime - lastWarn.timestamp.getTime()) < warnCooldown) {
            return interaction.reply("You cannot warn a user more than once in 3 days.");
        }

        // Check if the user reached the maximum number of warnings
        if (warns.length === maxWarnsBeforeBan - 1) {
            const banChannelId = config.banChannel;
            const banChannel = guild.channels.cache.get(banChannelId) as TextChannel;

            if (banChannel) {
                const lastWarnedBy = warns[warns.length - 1].moderatorID;
                banChannel.send(`<@${lastWarnedBy}>: User ${user.tag} has reached 3 warnings. Please consider banning them.`);
            }
            // TODO: Mute for 24 hours
        }

        // Add warning and apply role based on the number of warnings
        const warn = new Warn({
            userID: member.id,
            moderatorID: interaction.user.id,
            expiresAt: new Date(currentTime + warnCooldown),
            forceExpired: false,
            withMute: false,
            severity: warns.length === 0 ? 1 : warns.length === 1 ? 2 : 3,
            reason: reason ? reason : undefined,
        });
        await warn.save();

        if (warns.length < 2) {
            const warnRole = warns.length === 0 ? config.firstWarnRoleID : config.secondWarnRoleID;
            const role = guild.roles.cache.get(warnRole);

            if (role) {
                member?.roles.add(role);
            }
        }

        // Remove the warn role after 3 days
        setTimeout(() => {
            const roleToRemove = warns.length === 0 ? config.firstWarnRoleID : config.secondWarnRoleID;
            const role = guild.roles.cache.get(roleToRemove);

            if (role && member) {
                member?.roles.remove(role);
            }
        }, warnCooldown);

        interaction.reply(`User ${user.tag} has been warned for: ${reason || "No reason provided."}`);
    },
} as Command;