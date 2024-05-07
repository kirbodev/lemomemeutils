export default {
  name: "QOL Update",
  date: new Date(2024, 4, 7),
  version: "1.7.6",
  description:
    "General quality of life changes.",
  changelog: [
    "Added a new `banner` command.",
    "`modstats` now allows you to change graph types.",
    "`snipe` and `esnipe` are now separate commands.",
    "`snipe`/`esnipe` no longer require a channel argument.",
    "Snipes can no longer be deleted. They are now hidden instead. (until 24hr expiration)",
    "`changelog` is now consistent between slash and message commands."
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
