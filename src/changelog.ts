export default {
  name: "Sentience - small update",
  date: new Date(2024, 7, 6),
  version: "1.8.4beta",
  description: "Sentience is less horny and new modes. Namelock soon.",
  changelog: [
    "AI is now less horny",
    "New modes: mlg, hood, overlord",
    "Namelock soon",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
