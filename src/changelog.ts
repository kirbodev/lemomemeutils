export default {
  name: "Randomban",
  date: new Date(2024, 7, 13),
  version: "1.8.5",
  description: "Yep, ban people randomly",
  changelog: [
    "Ban people randomly",
    "Owners no longer are affected by rate limits",
    "namelock soon maybe the implentation is buggy rn",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
