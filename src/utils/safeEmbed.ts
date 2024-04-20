import { EmbedBuilder } from "discord.js";
import EmbedColors from "../structures/embedColors";
import getErrorStatus from "../handlers/errorHandler";

interface SafeEmbedOptions {
  withSystemMessages?: boolean;
}

export default function safeEmbed(
  embed: EmbedBuilder,
  options?: SafeEmbedOptions
) {
  const { data } = embed;
  options = options || {
    withSystemMessages: true,
  };
  // Truncate fields, prevent errors
  if (data.title && data.title.length > 256) {
    embed.setTitle(data.title.slice(0, 253) + "...");
  }
  if (data.description && data.description.length > 4096) {
    embed.setDescription(data.description.slice(0, 4093) + "...");
  }
  if (data.fields?.length ?? 0 > 25) {
    embed.setFields(data.fields!.slice(0, 25));
  }
  for (const field of data.fields || []) {
    if (field.name.length > 256) {
      field.name = field.name.slice(0, 253) + "...";
    }
    if (field.value.length > 1024) {
      field.value = field.value.slice(0, 1021) + "...";
    }
  }
  embed.setFields(data.fields || []);
  if (data.footer && data.footer.text && data.footer.text.length > 2048) {
    embed.setFooter({ text: data.footer.text.slice(0, 2045) + "..." });
  }
  if (data.author && data.author.name && data.author.name.length > 256) {
    embed.setAuthor({ name: data.author.name.slice(0, 253) + "..." });
  }
  if (
    (data.title?.length || 0) +
      (data.description?.length || 0) +
      (data.fields?.reduce(
        (acc, cur) => acc + cur.name.length + cur.value.length,
        0
      ) || 0) +
      (data.footer?.text?.length || 0) +
      (data.author?.name?.length || 0) >
    6000
  ) {
    embed.setDescription("This embed is too long to be displayed.");
    embed.setFields([]);
    embed.setFooter(null);
    embed.setAuthor(null);
    embed.setColor(EmbedColors.warning);
  }
  // Styling
  if (!data.color) {
    embed.setColor(EmbedColors.info);
  }
  if (!data.timestamp) {
    embed.setTimestamp();
  }
  if (options?.withSystemMessages) {
    const status = getErrorStatus();
    if (status && status.status >= 2) {
      embed.setColor(EmbedColors.warning);
      embed.addFields([
        {
          name: "Availability",
          value: `You may experience issues with Pomegranate services. Check the [status page](https://status.kdv.one) for more information.\n - ${
            status.messages.join("\n- ") || `Level ${status.status} issues`
          }`,
        },
      ]);
    }
  }
  return embed;
}
