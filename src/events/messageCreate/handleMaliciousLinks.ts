import { Client, Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import configs from "../../config";
import getBanButton from "../../helpers/handleBanButton";
import EmbedColors from "../../structures/embedColors";

dotenv.config();

const VIRUSTOTAL_API_KEY = process.env.TOTAL_VIRUS_KEY;

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = message.content.match(urlPattern);

  if (urls) {
    for (const url of urls) {
      await scanUrlWithVirusTotal(url, message, client);
    }
  }
};

const scanUrlWithVirusTotal = async (url: string, message: Message, client: Client) => {
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'x-apikey': VIRUSTOTAL_API_KEY,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: `url=${encodeURIComponent(url)}`
  };

  try {
    const response = await fetch('https://www.virustotal.com/api/v3/urls', options);
    const data = await response.json();

    if (data.data && data.data.attributes.last_analysis_stats.malicious > 0) {
      await message.delete();

      const logChannel = client.guild.channels.cache.get(configs.logChannelId);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle("Malicious URL Detected")
        .setDescription(`A potentially malicious URL was detected in a message sent by ${message.author.tag} and has been deleted.\nURL: ${url}`)
        .setColor(EmbedColors.warning);

      const banButton = new ButtonBuilder()
        .setCustomId('ban-user-' + message.author.id)
        .setLabel('Ban User')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(banButton);

      await logChannel.send({ embeds: [embed], components: [row] });

      client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        const [action, userId] = interaction.customId.split('-');
        if (action === 'ban-user') {
          await banMember(userId, interaction.guildId!, interaction.user);
          await interaction.update({ content: 'User has been banned.', components: [] });
        }
      });
    }
  } catch (err) {
    console.error('Error scanning URL with VirusTotal:', err);
  }
};
