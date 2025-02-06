import {
  APIEmbed,
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
  Interaction,
} from "discord.js";
import configs, { devs } from "../../config.js";
import Staff from "../../db/models/staff.js";
import setStaffLevel from "../../helpers/setStaffLevel.js";
import { HydratedDocument } from "mongoose";
import staffInterface, { StaffLevel } from "../../structures/staffInterface.js";
import EmbedColors from "../../structures/embedColors.js";
import safeEmbed from "../../utils/safeEmbed.js";
import Errors from "../../structures/errors.js";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("bypass-")) return;
  const config = configs.get(interaction.guildId!)!;
  // split after the first - and before the second - to get the type
  const type = interaction.customId.split("-").slice(1, 2).join("-");
  // split after the second - to get the user id
  const user = await client.users.fetch(
    interaction.customId.split("-").slice(2).join("-")
  );
  if (!user) return;
  await interaction.deferReply({ ephemeral: true });
  const member = await interaction.guild!.members.fetch(user.id);
  if (!member) return;
  const staff: HydratedDocument<staffInterface> | null = await Staff.findOne({
    userID: user.id,
    guildID: interaction.guild!.id,
    "decision.decisionAt": undefined,
  });
  if (!staff)
    return await interaction.followUp({
      content: "❌ No staff application found!",
      ephemeral: true,
    });
  if (type === "approve") {
    if (!devs.includes(interaction.user.id))
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorDevOnly)
              .setDescription(
                "You must be a developer to bypass approve staff applications. You are allowed to bypass deny staff applications."
              )
              .setColor(EmbedColors.error)
              .setTimestamp()
          ),
        ],
        ephemeral: true,
      });
    staff.decision.decisionAt = new Date();
    staff.decision.approved = true;
    await staff.save();
    staff.type === "staff"
      ? await setStaffLevel(staff, StaffLevel.Farmer)
      : await setStaffLevel(staff, StaffLevel.Event);
    await interaction.followUp({
      content: "✅ Approved!",
      ephemeral: true,
    });
    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Staff Application Approved")
        .setDescription(
          `Your staff application for ${
            interaction.guild!.name
          } has been approved!`
        )
        .setFields([
          {
            name: "Decision",
            value: `Bypass approved by ${interaction.user.tag}`,
          },
          {
            name: "Reason",
            value: staff.decision.reason || "No reason provided",
          },
        ])
        .setColor(EmbedColors.success)
        .setTimestamp(),
      {
        withSystemMessages: false,
      }
    );
    try {
      await client.users.cache.get(staff.userID)?.send({
        embeds: [embed],
      });
    } catch (e) {
      return;
    }
    try {
      const message = await interaction.channel!.messages.fetch(
        staff.voteMessage
      );
      if (!message) return;
      const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
        .addFields([
          {
            name: "Decision",
            value: `Bypass approved by ${interaction.user.tag}`,
          },
        ])
        .setColor(EmbedColors.success)
        .setTimestamp();
      await message.edit({
        components: [],
        embeds: [membed],
      });

      const staffChannel = interaction.guild!.channels.cache.get(
        config.staffApplicationsChannelID!
      ) as GuildTextBasedChannel;
      if (!staffChannel) return;
      staffChannel.send({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Staff Application Approved")
              .setDescription(
                `<@${staff.userID}>'s (${staff.userID}) staff application has been approved!`
              )
              .setFields([
                {
                  name: "Decision",
                  value: `Bypass approved by ${interaction.user.tag}`,
                },
                {
                  name: "Reason",
                  value: staff.decision.reason || "No reason provided",
                },
              ])
              .setColor(EmbedColors.success)
              .setTimestamp(Date.now()),
            {
              withSystemMessages: false,
            }
          ),
        ],
      });
    } catch (e) {
      return;
    }
  } else if (type === "decline") {
    staff.decision.decisionAt = new Date();
    staff.decision.approved = false;
    await staff.save();
    await interaction.followUp({
      content: "✅ Denied!",
      ephemeral: true,
    });
    const embed = safeEmbed(
      new EmbedBuilder()
        .setTitle("Staff Application Declined")
        .setDescription(
          `Your staff application for ${
            interaction.guild!.name
          } has been declined.`
        )
        .setFields([
          {
            name: "Decision",
            value: `Bypass denied by ${interaction.user.tag}`,
          },
          {
            name: "Reason",
            value: staff.decision.reason || "No reason provided",
          },
        ])
        .setColor(EmbedColors.error)
        .setTimestamp(),
      {
        withSystemMessages: false,
      }
    );
    try {
      await client.users.cache.get(staff.userID)?.send({
        embeds: [embed],
      });
    } catch (e) {
      return;
    }
    try {
      const message = await interaction.channel!.messages.fetch(
        staff.voteMessage
      );
      if (!message) return;
      const membed = new EmbedBuilder(message.embeds[0] as APIEmbed)
        .addFields([
          {
            name: "Decision",
            value: `Bypass denied by ${interaction.user.tag}`,
          },
        ])
        .setColor(EmbedColors.error)
        .setTimestamp();
      await message.edit({
        components: [],
        embeds: [membed],
      });

      const staffChannel = interaction.guild!.channels.cache.get(
        config.staffApplicationsChannelID!
      ) as GuildTextBasedChannel;
      if (!staffChannel) return;
      staffChannel.send({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Staff Application Declined")
              .setDescription(
                `<@${staff.userID}>'s (${staff.userID}) staff application has been declined.`
              )
              .setFields([
                {
                  name: "Decision",
                  value: `Bypass denied by ${interaction.user.tag}`,
                },
                {
                  name: "Reason",
                  value: staff.decision.reason || "No reason provided",
                },
              ])
              .setColor(EmbedColors.error)
              .setTimestamp(Date.now()),
            {
              withSystemMessages: false,
            }
          ),
        ],
      });
    } catch (e) {
      return;
    }
  }
};
