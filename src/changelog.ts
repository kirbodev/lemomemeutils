export default {
  name: "Snipe is here",
  date: new Date(2024, 3, 24),
  version: "1.7.3",
  description:
    "Finally, snipe is here, in beta. User feedback is appreciated.",
  changelog: [
    "Fixed a couple of bugs",
    "Removed status warning from some log messages",
    "Online status should now update properly",
    "Added snipe feature",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
