export default {
  name: "Sentience - Beta3",
  date: new Date(2024, 4, 18),
  version: "1.8.4beta",
  description:
    "Sentience can now use multiple API keys, and will use the one with the lowest usage count.",
  changelog: [
    "Events are now server specific",
    "High staff should be able to set events with `@Pomegranate setEvent <event>`",
    "Freaky mode has been disabled in HOV",
    "An experimental multi API key system has been added, which should reduce the chance of rate limiting",
    "The bot will now use the lowest usage count API key for each user",
    "Rizz mode has been added",
    "⚠️ All updates have been halted for about a month, so I can study for finals 🫡",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
