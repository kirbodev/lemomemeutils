export default {
  name: "Major Feature Update",
  date: new Date(2024, 2, 5),
  version: "1.6.0",
  description:
    "Broke the update streak with this one. This update includes a lot of new features and improvements.",
  changelog: [
    "AFK now more accurately finds links in afk messages and uses a function to figure out time until deletion for the message depending on message length.",
    "AFK also correctly embeds media that is not an image. Attachments above 15 seconds are not recommended as the message will be deleted before the attachment is finished.",
    "The bot now has analytics which will be used to track response times and usage of commands. Your usage will be linked to your user ID. Contact me to remove your data.",
    "Staff application system has been rewritten to use a new system and should be more reliable.",
    "`whois` now works as a normal whois command when not responding to a bot message.",
    "Fixed a bug where hwm doesn't exist.",
    "I'm going to be working on v2 from now on, this will add clustering to improve reliability. Find out more [here](https://pombot.notion.site/Clustering-V2-33243c0a6b0f4f46bd377457d69207ab?pvs=74).",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
