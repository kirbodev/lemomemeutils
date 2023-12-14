import { EmbedBuilder, GuildMember } from "discord.js";
import EmbedColors from "../structures/embedColors";
import { Action, Warn } from "../db";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface";

export default async function banMember(member: GuildMember, reason: string, mod: GuildMember, withParole?: boolean, expiresAt?: Date) {
    const warns: HydratedDocument<warnInterface>[] = await Warn.find({ userID: member.id });
    let dmSent: boolean;
    try {
        await member.send({
            embeds: [new EmbedBuilder()
                .setTitle("You have been banned")
                .setDescription(`You have been banned from \`${member.guild.name}\``)
                .setFields([
                    {
                        name: "Reason",
                        value: reason
                    },
                    {
                        name: "Moderator",
                        value: mod.user.tag
                    },
                    {
                        name: "Warnings",
                        value: warns.map((warn) => `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${warn.reason} - Issued by <@${warn.moderatorID}>`).join("\n")
                    },
                    {
                        name: "Parole",
                        value: withParole ? "Yes" : "No"
                    },
                    {
                        name: "Expires At",
                        value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:f>` : "Never"
                    },
                    {
                        name: "Appeal",
                        value: "You can appeal by joining the appeal server. https://discord.gg/EUsVK5E"
                    }
                ])
                .setColor(EmbedColors.warning)
                .setFooter({
                    text: `Banned by ${mod.user.tag}`,
                    iconURL: mod.user.displayAvatarURL()
                })
                .setTimestamp(Date.now())
            ]
        })
        dmSent = true;

        const ban = new Action({
            userID: member.id,
            moderatorID: mod.id,
            actionType: "ban",
            reason: reason,
            withParole: withParole,
            expiresAt: expiresAt
        })
        await ban.save();
    } catch (err) {
        dmSent = false;
    }
    try {
        await member.ban({ reason: reason });
        return {
            success: true,
            dmSent: dmSent
        }
    } catch (err) {
        return {
            success: false,
            dmSent: dmSent
        }
    }
}