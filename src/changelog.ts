export default {
  name: "Sentience",
  date: new Date(2024, 4, 12),
  version: "1.8.0beta",
  description:
    "So uh I'm sentient now.",
  changelog: [
    "Added AI",
    "AI is only available in the main chat(s)",
    "AI is very experimental, we're mostly just testing it out hence the beta",
    "You can activate the AI by pinging the bot when the bot is in chat, which happens at random, this could be seen by a 'hi' message or similar.",
    "Whois is now available to everyone, but identity will be anonymous except to mods",
    "Small bug fixes",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
