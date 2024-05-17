export default {
  name: "Sentience - Beta2",
  date: new Date(2024, 4, 17),
  version: "1.8.2beta",
  description:
    "Sentience finally is alive again.",
  changelog: [
    "A queue has been implemented to stop rate limits.",
    "Started using the new 1.5-flash model.",
    "Images can now be used in multi-turn messages.",
    "The bot will now have an afk status.",
    "Whether the AI kill signal is on is now told to the user.",
    "Small prompt improvements.",
    "I'll see but this will probably be the last update until after finals 💔"
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
