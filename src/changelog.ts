export default {
  name: "Major Feature Update",
  date: new Date(2024, 2, 18),
  version: "1.7.0",
  description:
    "Been a while since I've done one of these, but I've been working on a lot of stuff. Here's a summary of the changes:",
  changelog: [
    "Mods can now use modstats to see their moderation statistics.",
    "Addes safeEmbed to reduce errors, and notify users when there is a discord service disruption.",
    "Your message count is now tracked for analytics purposes. Contact <@1219393505600868443> to opt out.",
    "Ban button is now more stable and will work on bot restarts.",
    "The active warns section on embeds will now show the type of warn.",
    "Fixed a bug where caselogs would show unwarned warns and unwarns as warns.",
    "Added the ,av command to view a user's avatar, this will replace Dyno's avatar command.",
    "Probably some other stuff I forgot to write down.",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
