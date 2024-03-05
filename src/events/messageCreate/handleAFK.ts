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
    const extract = Afk.message
      ? await extractLink(Afk.message)
      : {
          text: "",
        };

    const embed = new EmbedBuilder()
      .setTitle("AFK")
      .setDescription(
        `<@${Afk.userID}> (${
          user?.tag || "Unknown name"
        }) has been AFK since ${ms(Date.now() - Afk.timestamp!.getTime(), {
          long: true,
        })} ago${extract.text ? ` with the message: "${extract.text}"` : ""}${
          Afk.expiresAt
            ? ` until <t:${Math.floor(Afk.expiresAt.getTime() / 1000)}:f>`
            : ""
        }.`
      )
      .setColor(EmbedColors.info);
    if (extract.attachment && extract.filePlacement === "embed") {
      embed.setImage(extract.attachment);
    }
    const msg = await message.reply({
      embeds: [embed],
      files:
        extract.attachment && extract.filePlacement === "message"
          ? [extract.attachment]
          : undefined,
    });
    deleteAfterRead(msg, extract.text, !!extract.attachment);
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
        .map(async (afk) =>
          afk.message ? (await extractLink(afk.message)).text : ""
        )
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
  if (hasAttachment) time += 15000;
  if (time < 5000) time = 5000;
  time = Math.min(time, 30000);
  setTimeout(() => {
    message.delete().catch(() => null);
  }, time);
};

const urlregex =
  /https:\/\/(?<subdomain>media|cdn)\.?(?<hostname>dis(?:cord)?app)\.(?<tld>com|net)\/[\w/.-]*\.(?<extension>[^.?]+)(?=[?])[\w?&=]+/i;
const extractLink = async (
  text: string
): Promise<{
  text: string;
  attachment?: string;
  filePlacement?: "embed" | "message" | "unallowed";
}> => {
  const urls = text.match(urlregex);
  if (!urls)
    return {
      text,
    };
  try {
    new URL(urls[0]);
  } catch {
    return {
      text,
    };
  }
  const ext = urls.groups?.extension;
  let placement: "embed" | "message" | "unallowed" = "embed";
  if (!ext)
    return {
      text,
    };
  if (ext === "mp4" || ext === "mov" || ext === "webm") {
    placement = "message";
  } else if (
    ext === "png" ||
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "gif" ||
    ext === "webp"
  ) {
    placement = "embed";
  } else {
    placement = "unallowed";
  }

  // Replace the urls with an empty string
  let newText = text.replace(urls[0], "");
  newText = newText.trim();
  return {
    text: newText,
    attachment: urls[0],
    filePlacement: placement,
  };
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
