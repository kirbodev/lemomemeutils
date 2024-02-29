export default {
  name: "Bug Fixes",
  date: new Date(2024, 1, 29),
  version: "1.5.3",
  description: "Whois is now a command! Say has also been fixed.",
  changelog: [
    ",whois will let you see who sent a message via the bot.",
    "The embed part of the say command has been fixed. Errors are also clearer.",
    "Staff apps will be rewritten in 1.6.0! (Sorry, not in this update.)",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
