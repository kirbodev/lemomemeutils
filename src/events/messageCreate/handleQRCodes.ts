import { Client, EmbedBuilder, Message } from "discord.js";
import QRCode from "qrcode-reader";
import Jimp from "jimp";
import { qrCodeAllowlist } from "../../config";
import EmbedColors from "../../structures/embedColors";

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (!message.attachments.size) return;
  message.attachments.forEach(async (attachment) => {
    if (!attachment.contentType?.startsWith("image")) return;
    if (!attachment.height || !attachment.width) return;
    if (attachment.ephemeral) return;
    const image = await Jimp.read(attachment.url);
    const qr = await getQRCode(image);
    if (!qr) return;
    let qrURL: URL;
    try {
      qrURL = new URL(qr);
    } catch (e) {
      return;
    }
    if (qrURL.protocol !== "https:") {
      if (message.guild!.safetyAlertsChannel) {
        message.guild!.safetyAlertsChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("Unsafe QR Code")
              .setDescription(
                `An unsafe QR code was found in ${message.author.tag}'s (${message.author.id}) message. The message has been deleted.`,
              )
              .setFields({ name: "URL", value: qrURL.href })
              .setColor(EmbedColors.error)
              .setFooter({
                text: "Please be careful when visiting this link.",
              })
              .setTimestamp(),
          ],
        });
      }
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("QR Code")
            .setDescription(
              "An unsafe QR code was found in this image. Your message has been deleted.",
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Sender: ${message.author.tag} (${message.author.id})`,
            })
            .setTimestamp(),
        ],
      });
      return message.deletable && message.delete();
    }
    if (!qrCodeAllowlist.includes(qrURL.hostname)) {
      if (message.guild!.safetyAlertsChannel) {
        message.guild!.safetyAlertsChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("QR Code")
              .setDescription(
                `An unallowed QR code was found in ${message.author.tag}'s (${message.author.id}) message. The message has been deleted.`,
              )
              .setFields({ name: "URL", value: qrURL.href })
              .setColor(EmbedColors.error)
              .setFooter({
                text: "Please be careful when visiting this link.",
              })
              .setTimestamp(),
          ],
        });
      }
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("QR Code")
            .setDescription(
              "An unallowed QR code was found in this image. Your message has been deleted.",
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Sender: ${message.author.tag} (${message.author.id})`,
            })
            .setTimestamp(),
        ],
      });
      return message.deletable && message.delete();
    }
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("QR Code")
          .setDescription("I found a QR code in this image!")
          .setFields({ name: "URL", value: qrURL.href })
          .setColor(EmbedColors.warning)
          .setFooter({
            text: "Please be careful when visiting this link.",
          })
          .setTimestamp(),
      ],
    });
  });
};

const getQRCode = async (image: Jimp) => {
  const qrcode = new QRCode();
  const qr = await new Promise<string | null>((resolve) => {
    qrcode.callback = (err: unknown, value: { result: string | null }) => {
      if (err) {
        resolve(null);
      } else {
        resolve(value.result);
      }
    };
    qrcode.decode(image.bitmap);
  });
  return qr;
};
