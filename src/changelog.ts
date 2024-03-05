export default {
  name: "New Command and a fraction of an AutoMod!",
  date: new Date(2024, 2, 4),
  version: "1.5.6",
  description: "3 day update streak 🔥! ",
  changelog: [
    "We received some feedback about the AFK command and made some changes to it.",
    "Added the `snipe` command (Slash only) with edit and deleted ",
    "Adding malicious link prevention with support from Total Virus to automatically detect malicious links and delete them, sending staff a notification to investigate.",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
