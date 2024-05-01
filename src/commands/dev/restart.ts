import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import EmbedColors from "../../structures/embedColors.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "restart",
  description: "Restart the bot without downtime.",
  devOnly: true,
  otpRequired: true,
  async slash(
    ogInteraction: ChatInputCommandInteraction,
    interaction: ModalSubmitInteraction | ChatInputCommandInteraction
  ) {
    // When using otpRequired, there will sometimes be the original interaction with all original data, and interaction which is the modal interaction which should be used for replying.
    // For simplicity, we will just use the modal interaction if it exists, otherwise we will use the original interaction so don't use modal-specific methods.
    if (!interaction) interaction = ogInteraction;

    await interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Restarting...")
            .setColor(EmbedColors.info)
            .setDescription(
              "The bot is restarting. The old instance will be available in the meanwhile."
            )
            .setTimestamp()
        ),
      ],
      ephemeral: true,
    });
    process.stdout.write("restartSignal");
  },
} as Command;
