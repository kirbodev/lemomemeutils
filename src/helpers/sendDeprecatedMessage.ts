import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import EmbedColors from "../structures/embedColors.js";
import safeEmbed from "../utils/safeEmbed.js";

export default function sendDeprecatedMessage(
  interaction: ChatInputCommandInteraction
) {
  const embed = safeEmbed(
    new EmbedBuilder()
      .setTitle("Deprecated")
      .setDescription(
        "Hey! This command is deprecated because a better alternative is provided by Pomelo!"
      )
      .setFields([
        {
          name: "What do you mean? What's pomelo?",
          value:
            "Pomelo is the public version of Pomegranate. It will eventually be its replacement. Find out more [here](https://pom.kdv.one/)",
        },
        {
          name: "What do I do?",
          value:
            "Pomelo is a drop-in replacement (with extra features!).\nFor message commands, you don't need to do anything.\nFor slash commands, you just need to select Pomelo instead of Pomegranate.",
        },
      ])
      .setColor(EmbedColors.info)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp(),
    {
      withSystemMessages: false,
    }
  );

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}
