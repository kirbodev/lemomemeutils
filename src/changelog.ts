export default {
  name: "Sentience - Beta2",
  date: new Date(2024, 4, 18),
  version: "1.8.3beta",
  description:
    "Sentience has events now.",
  changelog: [
    "Events are now a thing, they have a 33% chance to happen.",
    "The bot will tell you if there is an event set.",
    "Moderate the bot as normal! Some events may produce suggestive results",
    "Devs can set the event with `@Pomegranate setEvent <event>`",
    "Updates will be infrequent until after finals 💔"
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
