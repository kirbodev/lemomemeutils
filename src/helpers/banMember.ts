import { EmbedBuilder, GuildMember } from "discord.js";
import EmbedColors from "../structures/embedColors";
import warn from "../db/models/warn";

export default async function banMember(member: GuildMember, reason: string, mod: GuildMember) {
    const warns = await warn.find({ userID: member.id });
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
    } catch (err) {
        return false;
    }
    await member.ban({ reason: reason });
    return true;
}