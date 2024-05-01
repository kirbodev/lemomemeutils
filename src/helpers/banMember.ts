import { EmbedBuilder, GuildMember, User } from "discord.js";
import EmbedColors from "../structures/embedColors.js";
import Action from "../db/models/action.js";
import Warn from "../db/models/warn.js";
import { HydratedDocument } from "mongoose";
import warnInterface from "../structures/warnInterface.js";
import configs from "../config.js";
import safeEmbed from "../utils/safeEmbed.js";

export default async function banMember(
  member: GuildMember | User,
  reason: string,
  mod: GuildMember,
  withParole?: boolean,
  expiresAt?: Date,
  deleteMessages = false
) {
  const warns: HydratedDocument<warnInterface>[] = await Warn.find({
    userID: member.id,
    guildID: mod.guild.id,
    expiresAt: { $gte: new Date().getTime() },
    unwarn: { $exists: false },
  });
  const config = configs.get(mod.guild.id)!;
  let dmSent: boolean;
  try {
    await member.send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("You have been banned")
            .setDescription(`You have been banned from \`${mod.guild.name}\``)
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
              {
                name: "Parole",
                value: withParole ? "Yes" : "No",
              },
              {
                name: "Expires At",
                value: expiresAt
                  ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:f>`
                  : "Never",
              },
              {
                name: "Appeal",
                value: `You can appeal by joining the appeal server. ${
                  config.appealServer ?? "https://discord.gg/EUsVK5E"
                }`,
              },
            ])
            .setColor(EmbedColors.warning)
            .setFooter({
              text: `Banned by ${mod.user.tag}`,
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
  const ban = new Action({
    userID: member.id,
    moderatorID: mod.id,
    guildID: mod.guild.id,
    actionType: "ban",
    reason: reason,
    withParole: withParole,
    expiresAt: expiresAt,
  });
  await ban.save();
  try {
    await mod.guild.bans.create(member.id, {
      reason: reason,
      deleteMessageSeconds: deleteMessages ? 60 * 60 * 24 * 7 : undefined,
    });
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
