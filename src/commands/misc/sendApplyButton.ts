import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import EmbedColors from "../../structures/embedColors.js";
import kv from "../../db/models/kv.js";
import safeEmbed from "../../utils/safeEmbed.js";
import configs from "../../config.js";

export default {
  name: "sendapplybutton",
  description: "Send the embed with the apply button.",
  permissionsRequired: [PermissionsBitField.Flags.Administrator],
  async slash(interaction: ChatInputCommandInteraction) {
    const config = configs.get(interaction.guildId!);

    const buttons = new ActionRowBuilder<ButtonBuilder>();

    buttons.addComponents([
      new ButtonBuilder()
        .setCustomId(`apply-${interaction.guildId!}`)
        .setLabel("Apply")
        .setStyle(ButtonStyle.Primary),
    ]);
    config?.eventStaffRole
      ? buttons.addComponents([
          new ButtonBuilder()
            .setCustomId(`eventapply-${interaction.guildId!}`)
            .setLabel("Apply (Event Staff)")
            .setStyle(ButtonStyle.Success),
        ])
      : null;

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
    if (!interaction.inGuild()) return;
    const msg = await interaction.channel!.send({
      embeds: [embed],
      components: [buttons],
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
