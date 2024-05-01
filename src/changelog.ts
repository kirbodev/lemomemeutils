export default {
  name: "Downtime is over",
  date: new Date(2024, 4, 1),
  version: "1.7.4",
  description:
    "Minimised bot cold start time from ~60s to 500ms. A couple of other small changes.",
  changelog: [
    "Changed snipe. `esnipe` will be used for edits and `snipe` for deletes.",
    "Made the code work with latest versions of Node.js",
    "Made Fruit Harvester, a way to update the bot without downtime",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
