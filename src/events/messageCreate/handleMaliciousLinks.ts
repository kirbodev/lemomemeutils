import { Client, Message, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import EmbedColors from "../../structures/embedColors";

dotenv.config();

const VIRUSTOTAL_API_KEY = process.env.TOTAL_VIRUS_KEY;

export default async (client: Client, message: Message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  // Simple URL detection
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = message.content.match(urlPattern);

  if (urls) {
    for (const url of urls) {
      await scanUrlWithVirusTotal(url, message);
    }
  }
};

const scanUrlWithVirusTotal = async (url: string, message: Message) => {
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
      const embed = new EmbedBuilder()
        .setTitle("Malicious URL Detected")
        .setDescription(`A potentially malicious URL was detected and should be avoided: ${url}`)
        .setColor(EmbedColors.warning);

      await message.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Error scanning URL with VirusTotal:', err);
  }
};
