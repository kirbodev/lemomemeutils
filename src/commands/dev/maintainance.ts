import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import { maintainanceMode, toggleMode } from "../../config.js";
import EmbedColors from "../../structures/embedColors.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "maintainance",
  description: "Toggles maintainance mode. Only available to developers.",
  devOnly: true,
  otpRequired: true,
  async slash(
    ogInteraction: ChatInputCommandInteraction,
    interaction: ModalSubmitInteraction | ChatInputCommandInteraction
  ) {
    if (!interaction) interaction = ogInteraction;
    await interaction.deferReply({ ephemeral: true });
    toggleMode();
    interaction.followUp({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Maintainance Mode")
            .setDescription(
              `Maintainance mode has been ${
                maintainanceMode ? "enabled" : "disabled"
              }`
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
  },
} as Command;
