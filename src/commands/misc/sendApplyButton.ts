import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import kv from "../../db/models/kv";
import safeEmbed from "../../utils/safeEmbed";

export default {
  name: "sendapplybutton",
  description: "Send the embed with the apply button.",
  permissionsRequired: [PermissionsBitField.Flags.Administrator],
  async slash(interaction: ChatInputCommandInteraction) {
    const button = new ActionRowBuilder<ButtonBuilder>().setComponents([
      new ButtonBuilder()
        .setCustomId(`apply-${interaction.guildId!}`)
        .setLabel("Apply")
        .setStyle(ButtonStyle.Primary),
    ]);
    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Staff Application")
        .setDescription("Click the button below to apply for staff.")
        .setColor(EmbedColors.info)
        .setTimestamp(Date.now())
    );

    interaction.reply({
      content: "Sending...",
      ephemeral: true,
    });
    const msg = await interaction.channel!.send({
      embeds: [embed],
      components: [button],
    });
    const existing = await kv.findOne({
      key: `staffAppsMessage-${interaction.guildId}`,
    });
    if (!existing) {
      const newDoc = new kv({
        key: `staffAppsMessage-${interaction.guildId}`,
        value: msg.id,
      });
      await newDoc.save();
    } else {
      existing.value = msg.id;
      await existing.save();
    }
  },
} as Command;
