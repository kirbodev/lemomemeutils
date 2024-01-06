import { EmbedBuilder, GuildMember } from "discord.js";
import { Warn } from "../db";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface";
import configs from "../config";
import EmbedColors from "../structures/embedColors";
import muteMember from "./muteMember";

export enum WarnResponse {
    RateLimited,
    warnedOnParole,
    reachedMaxWarns,
    isAtMaxWarns,
    Success
}

export default async function warnMember(member: GuildMember, mod: GuildMember, severity: 1 | 2, reason?: string, withMute?: Date) {
    const config = configs.get(member.guild.id)!;
    const warns: HydratedDocument<warnInterface>[] = await Warn.find({ userID: member.id, guildID: member.guild.id, expiresAt: { $gte: new Date().getTime() }, unwarn: { $exists: false } });
    const currentTime = new Date().getTime();
    // Add together all the warns, with light being 1 point and heavy being 2 points
    const warnPoints = warns.reduce((acc, warn) => acc + (warn.severity), 0);
    const lastWarn = warns[warns.length - 1];
    if (lastWarn && lastWarn.timestamp.getTime() + 10000 > currentTime) {
        return {
            response: WarnResponse.RateLimited,
            warns
        };
    }
    if (warnPoints >= 3) return {
        response: WarnResponse.isAtMaxWarns,
        warns
    };

    let banReason: WarnResponse | undefined;

    if (warnPoints + severity >= 3) banReason = WarnResponse.reachedMaxWarns;
    if (member.roles.cache.has(config.paroleRoleID)) banReason = WarnResponse.warnedOnParole;

    let muteExpires: Date | undefined;
    if (withMute) {
        muteExpires = await muteMember(member, withMute, reason || "No reason provided");
    } 
    if (banReason) {
        muteExpires = await muteMember(member, new Date(currentTime + 1000 * 60 * 60 * 24), banReason === WarnResponse.reachedMaxWarns ? "Reached the maximum amount of warns." : "Warned while on parole.")
    }

    const warn = new Warn({
        userID: member.id,
        guildID: member.guild.id,
        moderatorID: mod.id,
        expiresAt: severity === 1 ? new Date(currentTime + 1000 * 60 * 60 * 24 * 3) : new Date(currentTime + 1000 * 60 * 60 * 24 * 7),
        severity,
        reason,
        withMute: muteExpires
    });
    await warn.save();

    const role = warnPoints + severity === 1 ? config.firstWarnRoleID : config.secondWarnRoleID;
    if (role) {
        await member.roles.add(role);
        setTimeout(async () => {
            // Fetch the warn again to make sure it hasn't been unwarned, this is to prevent a bug where the role is removed when it shouldn't be
            const newWarn = await Warn.findOne({ _id: warn._id });
            if (!newWarn) return;
            if (newWarn.unwarn) return;
            member.roles.remove(role);
        }, severity === 1 ? 1000 * 60 * 60 * 24 * 3 : 1000 * 60 * 60 * 24 * 7);
    }

    let dmSent = false;
    try {
        await member.send(
            {
                embeds: [
                    new EmbedBuilder()
                        .setTitle("You have been warned")
                        .setDescription(`You have been warned in \`${member.guild.name}\`. ${warnPoints + severity >= 3 ? "You have reached the maximum amount of warns, this means you have been temporarily muted while mods decide what to do next." : warnPoints + severity === 2 ? "If you recieve one more warn, you will be banned." : ""}`)
                        .setFields([
                            {
                                name: "Reason",
                                value: reason || "No reason provided"
                            },
                            {
                                name: "Moderator",
                                value: mod.user.tag
                            },
                            {
                                name: "Severity",
                                value: severity === 1 ? "Light" : "Heavy"
                            },
                            {
                                name: "Mute expires",
                                value: muteExpires ? `<t:${Math.floor(muteExpires.getTime() / 1000)}:f>` : "Not muted"
                            },
                            {
                                name: "Expires At",
                                value: `<t:${Math.floor(warn.expiresAt.getTime() / 1000)}:f>`
                            }
                        ])
                        .setColor(EmbedColors.warning)
                        .setFooter({
                            text: `Warned by ${mod.user.tag}`,
                            iconURL: mod.user.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ]
            }
        )
        dmSent = true;
    } catch (e) {
        // Do nothing
    }

    return {
        response: banReason || WarnResponse.Success,
        dmSent,
        warns,
        muteExpires
    }
}