export default {
  name: "AFK Command",
  date: new Date(2024, 2, 1),
  version: "1.5.4",
  description: "Since when do we have daily updates?",
  changelog: [
    "Set your AFK using /afk or ,afk, this is a drop-in replacement for Dyno's AFK command, but better and with more features. Try /help afk for more information.",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
