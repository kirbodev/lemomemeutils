export default {
  name: "Minor Update",
  date: new Date(2024, 3, 20),
  version: "1.7.2",
  description:
    "Coming back with few changes due to my ssd corrupting but snipe and suggestions will hopefully come soon. This update improves reliability.",
  changelog: [
    "Errors are now more clear",
    "Staff applications no longer fail to edit if a user has their DMs off",
    "Better error logging and analytics",
    "Not all commands fail when the DB is down anymore (only the ones that need it)",
    "We have a status page now! Check it out at https://status.kdv.one/",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
