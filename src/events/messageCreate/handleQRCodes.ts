import { Client, EmbedBuilder, Message, PermissionFlagsBits } from "discord.js";
import sharp from "sharp";
import { qrCodeAllowlist } from "../../config.js";
import EmbedColors from "../../structures/embedColors.js";

import { readBarcodesFromImageFile } from "zxing-wasm";
import analytics from "../../db/models/analytics.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (!message.attachments.size) return;
  const now = performance.now();
  message.attachments.forEach(async (attachment) => {
    if (!attachment.contentType?.startsWith("image")) return;
    if (!attachment.height || !attachment.width) return;
    if (attachment.ephemeral) return;
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages))
      return;
    const mainImage = await sharp(
      await (await fetch(attachment.url)).arrayBuffer()
    )
      .resize(500, 500)
      .toBuffer();
    const bg = sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });
    const image = await bg
      .composite([{ input: mainImage, gravity: "center" }])
      .png()
      .toBuffer();

    const qr = await getQRCode(image);
    if (!qr) return;
    const analytic = new analytics({
      name: "qrCode",
      guildID: message.guild?.id,
      userID: message.author.id,
      responseTime: performance.now() - now,
      type: "other",
    });
    await analytic.save();
    let qrURL: URL;
    try {
      qrURL = new URL(qr);
    } catch (e) {
      await message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("QR Code")
              .setDescription(
                "I found a QR code in this image, but it's not a valid URL. Your message has been deleted."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Sender: ${message.author.tag} (${message.author.id})`,
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return message.deletable && message.delete();
    }
    if (qrURL.protocol !== "https:") {
      if (message.guild!.safetyAlertsChannel) {
        message.guild!.safetyAlertsChannel.send({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle("Unsafe QR Code")
                .setDescription(
                  `An unsafe QR code was found in ${message.author.tag}'s (${message.author.id}) message. The message has been deleted.`
                )
                .setFields({ name: "URL", value: qrURL.href })
                .setColor(EmbedColors.error)
                .setFooter({
                  text: "Please be careful when visiting this link.",
                })
                .setTimestamp(Date.now())
            ),
          ],
        });
      }
      await message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("QR Code")
              .setDescription(
                "An unsafe QR code was found in this image. Your message has been deleted."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Sender: ${message.author.tag} (${message.author.id})`,
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return message.deletable && message.delete();
    }
    if (!qrCodeAllowlist.includes(qrURL.hostname.replace("www.", ""))) {
      if (message.guild!.safetyAlertsChannel) {
        message.guild!.safetyAlertsChannel.send({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle("QR Code")
                .setDescription(
                  `An unallowed QR code was found in ${message.author.tag}'s (${message.author.id}) message. The message has been deleted.`
                )
                .setFields({ name: "URL", value: qrURL.href })
                .setColor(EmbedColors.error)
                .setFooter({
                  text: "Please be careful when visiting this link.",
                })
                .setTimestamp(Date.now())
            ),
          ],
        });
      }
      await message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("QR Code")
              .setDescription(
                "An unallowed QR code was found in this image. Your message has been deleted. Only youtube, twitch, instagram and facebook links are allowed."
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Sender: ${message.author.tag} (${message.author.id})`,
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
      return message.deletable && message.delete();
    }
    message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("QR Code")
            .setDescription("I found a QR code in this image!")
            .setFields({ name: "URL", value: qrURL.href })
            .setColor(EmbedColors.warning)
            .setFooter({
              text: "Please be careful when visiting this link.",
            })
            .setTimestamp(Date.now())
        ),
      ],
    });
  });
};

const getQRCode = async (image: Buffer) => {
  const blob = new Blob([image], { type: "image/png" });
  const result = await readBarcodesFromImageFile(blob, {
    maxNumberOfSymbols: 1,
    formats: ["QRCode", "MicroQRCode"],
  });
  return result[0]?.text;
};
