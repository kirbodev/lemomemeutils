import { EmbedBuilder, Message } from "discord.js";
import safeEmbed from "../utils/safeEmbed.js";
import EmbedColors from "../structures/embedColors.js";
import { hasGuildMembers, hasMessageContent } from "../utils/capabilities.js";
import logger from "./logger.js";

const notified = new Set<string>();
const CHANNEL_NOTICE_DELETE_MS = 7000;

// Returns a human-readable explanation when a capability is missing, or null
// when the bot has full access to it.
export function missingMessageContentReason(): string | null {
  if (hasMessageContent()) return null;
  return (
    "This bot is **missing the Message Content privilege**, so it can no longer read the text or " +
    "images of most messages in your server. Messages that mention it, reply to it, or come from " +
    "DMs are still readable.\n\n" +
    "Because of that, these features are limited or unavailable:\n" +
    "- **Prefix commands & hard replies** (e.g. `,help`, `,ban`)\n" +
    "- **AFK auto-removal** when you come back\n" +
    "- **Staff application reasons** (`r<reason>`)\n" +
    "- **QR-code scanning** of images\n" +
    "- **Snipe snapshots** of deleted/edited messages\n\n" +
    "This is a developer configuration issue; server staff can re-enable it in the Developer Portal."
  );
}

export function missingGuildMembersReason(): string | null {
  if (hasGuildMembers()) return null;
  return (
    "This bot is **missing the Guild Members privilege**, so it cannot request a full member list " +
    "and therefore can't look at *every* member of a server.\n\n" +
    "Because of that, these features are unavailable:\n" +
    "- **Randomban** (needs the full member list)\n" +
    "- **Member join events** (auto-persisted warnings / pardons / thin-ice)\n" +
    "- **Name-based member search** (e.g. `,avatar <name>`)\n\n" +
    "Actions against a specific member still work fine."
  );
}

// First-use notice: DM the user full details once per session, and post a short
// auto-deleting notice in the channel so the dropped message isn't a mystery.
export async function notifyMessageContentDowngrade(
  message: Message
): Promise<void> {
  const reason = missingMessageContentReason();
  if (!reason) return;
  const guildName = message.guild?.name ?? "this server";

  const dmSeenKey = `dm:${message.author.id}:${message.guild!.id}:content`;
  if (!notified.has(dmSeenKey)) {
    notified.add(dmSeenKey);
    try {
      await message.author.send({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Message Content feature is disabled")
              .setDescription(
                `I couldn't read your message in **${guildName}**. ${reason}`
              )
              .setColor(EmbedColors.warning)
              .setFooter({ text: "Only shown once per session." })
              .setTimestamp(Date.now())
          ),
        ],
      });
    } catch (e) {
      logger.debug(
        `Failed to send capability notice DM to ${message.author.tag}: ${e}`
      );
    }
  }

  const channelSeenKey = `channel:${message.channel.id}:${message.guild!.id}:content`;
  if (notified.has(channelSeenKey)) return;
  notified.add(channelSeenKey);

  if (!("send" in message.channel)) return;
  try {
    const notice = await message.channel.send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("I couldn't read that message")
            .setDescription(
              `I'm missing the **Message Content** feature, so I couldn't read your message in **${guildName}**. I've sent you the details in your DMs.`
            )
            .setColor(EmbedColors.warning)
            .setFooter({ text: "This notice will disappear shortly." })
        ),
      ],
    });
    setTimeout(
      () => notice.delete().catch(() => null),
      CHANNEL_NOTICE_DELETE_MS
    );
  } catch (e) {
    // No permission to send in the channel; the DM (if sent) covers the rest.
  }
}

// First-use DM notice for features that need the full member list. DMs only.
export async function notifyGuildMembersDowngrade(
  message: Message
): Promise<void> {
  const reason = missingGuildMembersReason();
  if (!reason) return;
  const guildName = message.guild?.name ?? "this server";

  const dmSeenKey = `dm:${message.author.id}:${message.guild!.id}:guildmembers`;
  if (notified.has(dmSeenKey)) return;
  notified.add(dmSeenKey);

  try {
    await message.author.send({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle("Guild Members feature is disabled")
            .setDescription(
              `Something you tried in **${guildName}** needs the bot to see every member, but that feature is disabled. ${reason}`
            )
            .setColor(EmbedColors.warning)
            .setFooter({ text: "Only shown once per session." })
            .setTimestamp(Date.now())
        ),
      ],
    });
  } catch (e) {
    logger.debug(
      `Failed to send capability notice DM to ${message.author.tag}: ${e}`
    );
  }
}

// Full error embed used by commands that cannot work without Guild Members
// (e.g. `/randomban`).
export function guildMembersRequiredEmbed(feature: string): EmbedBuilder {
  return safeEmbed(
    new EmbedBuilder()
      .setTitle("This feature is unavailable")
      .setDescription(
        `**${feature}** needs the bot to see every member in the server, but it doesn't have the **Guild Members** privilege enabled.\n\n${
          missingGuildMembersReason() ??
          "This feature needs the Guild Members privileged intent."
        }`
      )
      .setColor(EmbedColors.error)
      .setFooter({ text: "This is a configuration issue." })
      .setTimestamp(Date.now())
  );
}