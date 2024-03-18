import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageComponentInteraction,
  AttachmentBuilder,
  ButtonInteraction,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import Dev from "../../db/models/dev";
import speakeasy from "speakeasy";
import EmbedColors from "../../structures/embedColors";
import qrcode from "qrcode";
import { nanoid } from "nanoid";
import showOTPModal from "../../helpers/showOTPModal";
import safeEmbed from "../../utils/safeEmbed";

export default {
  name: "otp",
  description:
    "Generates your OTP secret. Used to perform dangerous actions. Only available to developers.",
  devOnly: true,
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: true,
    });
    const dev = await Dev.findOne({ id: interaction.user.id });
    if (!dev) {
      const id = nanoid();
      await interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("OTP Secret")
              .setDescription(
                `Are you sure you want to generate an OTP secret? You will only be able to generate one once. If you lose your secret, you will have to contact a developer to reset it.`
              )
              .setColor(EmbedColors.warning)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success)
                .setCustomId(`${id}0`)
            )
            .addComponents(
              new ButtonBuilder()
                .setLabel("No")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(`${id}1`)
            ),
        ],
      });
      const filter = (i: MessageComponentInteraction) =>
        i.customId.startsWith(id) && i.user.id === interaction.user.id;
      try {
        const i = await interaction.channel!.awaitMessageComponent({
          filter,
          time: 120000,
        });
        if (i.customId === `${id}0`) {
          const id2 = nanoid();
          const secret = speakeasy.generateSecret({
            name: "Pomegranate",
          });
          const qr = await qrcode.toBuffer(secret.otpauth_url!);
          const qrid = nanoid();
          const attachment = new AttachmentBuilder(qr, {
            name: `${qrid}.png`,
          });
          await i.reply({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle("OTP Secret")
                  .setDescription(
                    `Use an OTP app such as Google Authenticator to scan the QR code below. Alternatively, you can enter the secret manually into your OTP app.`
                  )
                  .addFields([
                    {
                      name: "Secret (Hold to copy)",
                      value: `${secret.base32}`,
                    },
                  ])
                  .setImage(`attachment://${qrid}.png`)
                  .setColor(EmbedColors.success)
                  .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
              ),
            ],
            components: [
              // Create a button which then pops up a modal to enter the OTP code
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(id2)
                  .setLabel("Enter OTP Code")
                  .setStyle(ButtonStyle.Primary)
              ),
            ],
            files: [attachment],
            ephemeral: true,
          });
          const filter2 = (i: MessageComponentInteraction) =>
            i.customId === id2 && i.user.id === interaction.user.id;
          try {
            const b = await interaction.channel!.awaitMessageComponent({
              filter: filter2,
              time: 60000,
            });
            const m = await showOTPModal(b as ButtonInteraction, secret.ascii);
            if (m === "timeout") {
              i.editReply({
                embeds: [
                  safeEmbed(
                    new EmbedBuilder()
                      .setTitle("OTP Secret")
                      .setDescription(
                        `You took too long to enter your OTP code. You can delete the secret from your OTP app and try again.`
                      )
                      .setColor(EmbedColors.error)
                      .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                      })
                      .setTimestamp(Date.now())
                  ),
                ],
                files: [],
              });
            } else if (m === "invalid") {
              i.editReply({
                embeds: [
                  safeEmbed(
                    new EmbedBuilder()
                      .setTitle("OTP Secret")
                      .setDescription(
                        `Your OTP code was invalid. You can delete the secret from your OTP app and try again.`
                      )
                      .setColor(EmbedColors.error)
                      .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                      })
                      .setTimestamp(Date.now())
                  ),
                ],
                files: [],
              });
            } else {
              m.reply({
                embeds: [
                  safeEmbed(
                    new EmbedBuilder()
                      .setTitle("OTP Secret")
                      .setDescription(
                        `Your OTP secret has been verified. You can now use commands that require OTP authentication.`
                      )
                      .setColor(EmbedColors.success)
                      .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                      })
                      .setTimestamp(Date.now())
                  ),
                ],
                ephemeral: true,
              });
            }
            i.editReply({
              components: [],
              files: [],
            });
            interaction.editReply({
              components: [],
            });
          } catch (e) {
            i.editReply({
              embeds: [
                safeEmbed(
                  new EmbedBuilder()
                    .setTitle("OTP Secret")
                    .setDescription(
                      `You took too long to enter your OTP code. You can delete the secret from your OTP app and try again.`
                    )
                    .setColor(EmbedColors.error)
                    .setFooter({
                      text: `Requested by ${interaction.user.tag}`,
                      iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp(Date.now())
                ),
              ],
              components: [],
            });
            interaction.editReply({
              components: [],
            });
          }
        } else {
          interaction.editReply({
            embeds: [
              safeEmbed(
                new EmbedBuilder()
                  .setTitle("OTP Secret")
                  .setDescription(
                    `You have chosen not to generate an OTP secret.`
                  )
                  .setColor(EmbedColors.warning)
                  .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
              ),
            ],
            components: [],
          });
        }
      } catch (e) {
        // Timeout
      }
    } else {
      interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("OTP Secret")
              .setDescription(
                `You have already generated an OTP secret. For security reasons, you are not allowed to generate another one. If you have lost your secret, please contact a developer.`
              )
              .setColor(EmbedColors.warning)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }
  },
} as Command;
