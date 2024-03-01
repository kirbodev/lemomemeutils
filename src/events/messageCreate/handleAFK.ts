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
      deleteAfterRead(msg, 1);
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

  const afks = [];
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
    const extract = Afk.message ? extractLink(Afk.message) : [null, ""];

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
    deleteAfterRead(msg, 1);
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
    deleteAfterRead(msg, afks.length);
  }
};

const deleteAfterRead = async (message: Message, afks: number) => {
  setTimeout(() => {
    message.delete().catch(() => null);
  }, afks * 10000);
};

const urlregex =
  /(https:\/\/media\.discordapp\.net\/attachments\/[0-9]{18,}\/[0-9]{18,}\/.+\..{2,})/i;
const extractLink = (text: string): [string | null, string] => {
  const urls = text.match(urlregex);
  console.log(urls, text);
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
