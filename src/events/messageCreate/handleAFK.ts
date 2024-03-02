import { Client, EmbedBuilder, Message } from "discord.js";
import afk from "../../db/models/afk";
import { HydratedDocument } from "mongoose";
import afkInterface from "../../structures/afkInterface";
import EmbedColors from "../../structures/embedColors";
import ms from "ms";
import configs from "../../config";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (message.author.bot) return;
  const userAfk: HydratedDocument<afkInterface> | null = await afk.findOne({
    userID: message.author.id,
    guildID: message.guild.id,
  });
  if (userAfk) {
    const config = configs.get(message.guild.id)!;
    if (userAfk.expiresAt && userAfk.expiresAt.getTime() < Date.now()) {
      await userAfk.deleteOne();
    } else if (
      !message.content.endsWith("--afk") &&
      !message.content.startsWith(`${config.prefix}afk`)
    ) {
      await userAfk.deleteOne();
      const msg = await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("AFK")
            .setDescription(
              `You are no longer AFK, welcome back! You were AFK for ${ms(
                Date.now() - userAfk.timestamp!.getTime(),
                { long: true }
              )}.`
            )
            .setColor(EmbedColors.info)
            .setFooter({
              text: "Psss... you can stop this from happening by ending your message with --afk!",
            }),
        ],
      });
      deleteAfterRead(msg);
    }
  }

  if (!message.mentions.parsedUsers && !message.mentions.repliedUser) return;
  const mentioned = message.mentions.repliedUser
    ? message.mentions.parsedUsers.set(
        message.mentions.repliedUser.id,
        message.mentions.repliedUser
      )
    : message.mentions.parsedUsers;
  mentioned.delete(message.author.id);

  const afks: HydratedDocument<afkInterface>[] = [];
  for (const user of mentioned) {
    const Afk: HydratedDocument<afkInterface> | null = await afk.findOne({
      userID: user[0],
      guildID: message.guild.id,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date().getTime() } },
      ],
    });
    if (!Afk) return;
    afks.push(Afk);
  }
  if (afks.length === 0) return;

  if (afks.length === 1) {
    const Afk = afks[0];
    const user = await client.users.fetch(Afk.userID).catch(() => null);
    const extract: [string | null, string] = Afk.message
      ? extractLink(Afk.message)
      : [null, ""];

    const embed = new EmbedBuilder()
      .setTitle("AFK")
      .setDescription(
        `<@${Afk.userID}> (${
          user?.tag || "Unknown name"
        }) has been AFK since ${ms(Date.now() - Afk.timestamp!.getTime(), {
          long: true,
        })} ago${extract[1] ? ` with the message: "${extract[1]}"` : ""}${
          Afk.expiresAt
            ? ` until <t:${Math.floor(Afk.expiresAt.getTime() / 1000)}:f>`
            : ""
        }.`
      )
      .setColor(EmbedColors.info);
    if (extract[0]) embed.setImage(extract[0]);
    const msg = await message.reply({
      embeds: [embed],
    });
    deleteAfterRead(msg, extract[1], !!extract[0]);
  } else {
    const embed = new EmbedBuilder()
      .setTitle("AFK")
      .setDescription("Multiple users you pinged are AFK.")
      .setColor(EmbedColors.info);
    for (const Afk of afks) {
      const user = await client.users.fetch(Afk.userID).catch(() => null);
      embed.addFields([
        {
          name: `${user?.tag || "Unknown name"}`,
          value: `<@${Afk.userID}> (${
            user?.tag || "Unknown name"
          }) has been AFK since ${ms(Date.now() - Afk.timestamp!.getTime(), {
            long: true,
          })} ago${Afk.message ? ` with the message: "${Afk.message}"` : ""}${
            Afk.expiresAt
              ? ` until <t:${Math.floor(Afk.expiresAt.getTime() / 1000)}:f>`
              : ""
          }.`,
        },
      ]);
    }
    const msg = await message.reply({
      embeds: [embed],
    });
    deleteAfterRead(
      msg,
      afks
        .map((afk) => (afk.message ? extractLink(afk.message)[1] : ""))
        .join(" ")
    );
  }
};

const deleteAfterRead = async (
  message: Message,
  text?: string,
  hasAttachment?: boolean
) => {
  const afkchars = text?.length ?? 50;
  let time = afkchars * 75;
  time = Math.floor(ease(time / 30000) * 30000);
  if (hasAttachment) time += 5000;
  if (time < 5000) time = 5000;
  time = Math.min(time, 30000);
  setTimeout(() => {
    message.delete().catch(() => null);
  }, time);
};

const urlregex =
  /(https:\/\/(media|cdn)\.discordapp\.(net|com)\/(attachments|ephemeral-attachments).+(?=\s))/i;
const extractLink = (text: string): [string | null, string] => {
  const urls = text.match(urlregex);
  if (!urls) return [null, text];
  try {
    new URL(urls[0]);
  } catch {
    return [null, text];
  }
  // Replace the urls with an empty string
  let newText = text.replace(urls[0], "");
  newText = newText.trim();
  return [urls[0], newText];
};

const ease = (x: number): number => {
  // cubic-bezier: 0.2, 0.6, 0.6, 1
  const p0 = 0.2;
  const p1 = 0.6;
  const p2 = 0.6;
  const p3 = 1;

  const cX = 3 * (p1 - p0);
  const bX = 3 * (p2 - p1) - cX;
  const aX = p3 - p0 - cX - bX;

  return ((aX * x + bX) * x + cX) * x + p0;
};
