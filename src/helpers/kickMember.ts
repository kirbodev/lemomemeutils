import { EmbedBuilder, GuildMember } from "discord.js";
import EmbedColors from "../structures/embedColors";
import { Action, Warn } from "../db";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface";
import safeEmbed from "../utils/safeEmbed";

export default async function kickMember(
  member: GuildMember,
  mod: GuildMember,
  reason: string
) {
  const warns: HydratedDocument<warnInterface>[] = await Warn.find({
    userID: member.id,
    guildID: mod.guild.id,
    expiresAt: { $gte: new Date().getTime() },
    unwarn: { $exists: false },
  });
  let dmSent: boolean;
  const invite =
    member.guild.vanityURLCode ??
    member.guild.invites.cache.find(
      (inv) => inv.inviterId === member.client.user.id
    )?.code;
  try {
    await member.send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("You have been kicked")
            .setDescription(
              `You have been kicked from \`${
                mod.guild.name
              }\`. You can rejoin at any time, but if you continue to break the rules, you will be banned. ${
                invite ? `discord.gg/${invite}` : ""
              }`
            )
            .setFields([
              {
                name: "Reason",
                value: reason,
              },
              {
                name: "Moderator",
                value: mod.user.tag,
              },
              {
                name: "Active warnings",
                value: warns
                  .map(
                    (warn) =>
                      `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:f> - ${
                        warn.reason
                      } - Issued by <@${warn.moderatorID}>`
                  )
                  .join("\n"),
              },
            ])
            .setColor(EmbedColors.warning)
            .setFooter({
              text: `Kicked by ${mod.user.tag}`,
              iconURL: mod.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });
    dmSent = true;
  } catch (err) {
    dmSent = false;
  }
  const kick = new Action({
    userID: member.id,
    moderatorID: mod.id,
    guildID: mod.guild.id,
    actionType: "kick",
    reason: reason,
  });
  await kick.save();
  try {
    await mod.guild.members.kick(member, reason);
    return {
      success: true,
      dmSent: dmSent,
    };
  } catch (err) {
    return {
      success: false,
      dmSent: dmSent,
    };
  }
}
