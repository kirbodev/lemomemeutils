import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
} from "discord.js";
import Dev from "../db/models/dev";
import { nanoid } from "nanoid";
import verifyOTP from "./verifyOTP";
import Errors from "../structures/errors";
import EmbedColors from "../structures/embedColors";

export default async function showOTPModal(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  secret: string,
) {
  const id = nanoid();
  interaction.showModal(
    new ModalBuilder()
      .setTitle("OTP Secret")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setLabel("OTP Code")
            .setCustomId(nanoid())
            .setPlaceholder("Enter OTP Code")
            .setMinLength(6)
            .setMaxLength(6)
            .setStyle(TextInputStyle.Short),
        ),
      )
      .setCustomId(id),
  );
  try {
    const m = await interaction.awaitModalSubmit({
      time: 60000,
      filter: (i) => i.customId === id && i.user.id === interaction.user.id,
    });
    const code = m.components[0].components[0].value;
    const verified = await verifyOTP(secret, code);
    if (verified) {
      const existingDev = await Dev.findOne({
        secret: secret,
      });
      if (existingDev) return m;
      const dev = new Dev({
        id: interaction.user.id,
        secret: secret,
      });
      await dev.save();
      return m;
    } else {
      m.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription("The OTP code you entered is invalid.")
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
        ],
        components: [],
        ephemeral: true,
      });
      return "invalid";
    }
  } catch (err) {
    return "timeout";
  }
}
