import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
} from "discord.js";
import Job from "../structures/jobInterface";
import safeEmbed from "../utils/safeEmbed";
import EmbedColors from "../structures/embedColors";

export default {
  every: "1 year",
  dontRunOnStart: false,
  execute: async (client: Client) => {
    let dmCount = 0;
    const guilds = Array.from(client.guilds.cache);
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("aprilfools")
        .setLabel("Appeal")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🔓")
    );
    const userlist: string[] = [];
    for (const guild of guilds) {
      const users = await guild[1].members.fetch();
      for (const ruser of users) {
        const user = ruser[1];
        if (userlist.includes(user.id)) continue;
        userlist.push(user.id);
        const embed = safeEmbed(
          new EmbedBuilder()
            .setTitle("You have been banned")
            .setDescription(`You have been banned from \`${guild[1].name}\``)
            .setFields([
              {
                name: "Reason",
                value: "No reason provided",
              },
              {
                name: "Moderator",
                value: "kdv_",
              },
              {
                name: "Parole",
                value: "No",
              },
              {
                name: "Expires At",
                value: "Never",
              },
              {
                name: "Appeal",
                value: `You can appeal by clicking the button below.`,
              },
            ])
            .setColor(EmbedColors.warning)
            .setFooter({
              text: `Banned by _dankus`,
              iconURL:
                "https://cdn.discordapp.com/avatars/923993065784508496/e8aaf7eb0738f6fd212afdb15aa02639.webp",
            })
            .setTimestamp(Date.now()),
          {
            withSystemMessages: false,
          }
        );
        try {
          await user.send({ embeds: [embed], components: [button] });
          dmCount++;
        } catch (e) {
          continue;
        }
      }
    }
    return `Sent ${dmCount} DMs to users.`;
  },
} as Job;