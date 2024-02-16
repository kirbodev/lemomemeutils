export default {
  name: "Bug Fixes + Small Feature Update",
  date: new Date(2024, 1, 16),
  version: "1.5.0",
  description: "Fixed some bugs and added a QR code filtering system.",
  changelog: [
    "Fixed a bug where all staff could use unban.",
    "Changed the way staff applications are handled.",
    "Added a delete_messages option to the ban slash command.",
    "Added a QR code filtering system to the bot.",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
