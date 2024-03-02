export default {
  name: "Changes to the AFK Command",
  date: new Date(2024, 2, 2),
  version: "1.5.5",
  description: "3 day update streak 🔥! ",
  changelog: [
    "We received some feedback about the AFK command and made some changes to it.",
    "The AFK command now supports attachments. Either use the `attachment` option on </afk:1213262685450276944> or attach a file when using `,afk`.",
    "Made the anti-dyno advisory message more clear.",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
