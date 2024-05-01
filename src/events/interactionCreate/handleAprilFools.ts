import { Client, EmbedBuilder, Interaction } from "discord.js";
import analytics from "../../db/models/analytics.js";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "aprilfools") return;
  const embed = new EmbedBuilder()
    .setTitle("April Fools")
    .setDescription("imagine lmao")
    .setImage("https://i.ibb.co/g9r3ZcK/buddydontsaythateveragain.jpg")
    .setColor("#ff0000");
  await interaction.update({ embeds: [embed] });
  const anal = new analytics({
    guildID: "0",
    userID: interaction.user.id,
    action: "aprilfools",
    name: "aprilfools",
    type: "button",
    timestamp: Date.now(),
    responseTime: 0,
  });
  await anal.save();
};
