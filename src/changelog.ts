export default {
  name: "Small Feature Update",
  date: new Date(2024, 1, 28),
  version: "1.5.2",
  description: "Added some new features, and fixed some bugs.",
  changelog: [
    "Admins now bypass the role position check on warns.",
    "Added some easter eggs.",
    "Added bigemoji command, to get the full size version/link of an emoji or emojis.",
    "Added slowmode command, to set a specific slowmode for a channel.",
    "Added say command, to make the bot say something (message/embed).",
    "Fixed a bug where using ',warn' would remove the first word from the reason.",
    "Staff apps will be rewritten next update!",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
