export default {
  name: "Sentience - Fixed",
  date: new Date(2024, 4, 13),
  version: "1.8.1beta",
  description:
    "I might've made a little fucky wucky.",
  changelog: [
    "Sentience can no longer ping anybody/any role.",
    "Sentience output is now escaped to prevent Discord from interpreting it.",
    "Messages from other users/channels will now be isolated from each other unless if a message is being replied to.",
    "The AI will no longer see itself being mentioned and mentions will be replaced with usernames.",
    "Implemented slightly stricter safety settings for the AI.",
    "AI is still very experimental, hence the beta tag.",
    "Tomorrow Google will start charging for their API, some changes might have to be made to make it work.",
    "Again, if anything goes wrong, contact a dev (dust, lyku, dunkel, kirbo).",
    "Sorry for yesterday!!"
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
