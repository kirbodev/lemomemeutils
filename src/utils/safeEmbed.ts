import { EmbedBuilder } from "discord.js";
import EmbedColors from "../structures/embedColors";

interface SafeEmbedOptions {
  withSystemMessages?: boolean;
}

interface DiscordStatusIncidentUpdate {
  body: string;
  created_at: Date;
  display_at: Date;
  id: string;
  incident_id: string;
  status:
    | "investigating"
    | "identified"
    | "monitoring"
    | "resolved"
    | "postmortem";
  updated_at: Date;
  affected_components: {
    code: string;
    name: string;
    old_status: string;
    new_status: string;
  }[];
}

interface DiscordStatusResponse {
  page: {
    id: "srhpyqt94yxb";
    name: "Discord";
    url: "https://discordstatus.com";
    updated_at: Date;
  };
  status: {
    description: string;
    indicator: "none" | "minor" | "major" | "critical";
  };
  components: {
    created_at: Date;
    description: string | null;
    id: string;
    name: string;
    page_id: string;
    position: number;
    status:
      | "operational"
      | "degraded_performance"
      | "partial_outage"
      | "major_outage";
    updated_at: Date;
  }[];
  incidents: {
    created_at: Date;
    id: string;
    impact: string;
    incident_updates: DiscordStatusIncidentUpdate[];
    monitoring_at: Date | null;
    name: string;
    page_id: string;
    resolved_at: Date | null;
    shortlink: string;
    status:
      | "investigating"
      | "identified"
      | "monitoring"
      | "resolved"
      | "postmortem";
    updated_at: Date;
  }[];
  scheduled_maintenances: {
    created_at: Date;
    id: string;
    impact: string;
    incident_updates: DiscordStatusIncidentUpdate[];
    monitoring_at: Date | null;
    name: string;
    page_id: string;
    resolved_at: Date | null;
    scheduled_for: Date;
    scheduled_until: Date;
    shortlink: string;
    status: string;
    updated_at: Date;
  }[];
}

export let statusCache = await getDiscordStatus();

setInterval(async () => {
  // revalidate the cache every minute
  const newStatus = await getDiscordStatus();
  if (newStatus) statusCache = newStatus;
}, 1000 * 60);

async function getDiscordStatus(): Promise<DiscordStatusResponse | null> {
  const res = await fetch("https://discordstatus.com/api/v2/summary.json")
    .then(async (res) => (await res.json()) as DiscordStatusResponse)
    .catch(() => null);
  if (!res) return null;
  return res;
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
    if (statusCache?.status.indicator !== "none") {
      embed.setColor(EmbedColors.warning);
      embed.addFields([
        {
          name: "Availability",
          value: `You may experience issues with Pomegranate and Discord services. Check [status.discord.com](https://status.discord.com) for more information. The current status is: ${
            statusCache!.status.description
          }.`,
        },
      ]);
    }
  }
  return embed;
}
