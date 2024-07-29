export default {
  name: "Sentience - Beta3",
  date: new Date(2024, 7, 29),
  version: "1.8.4beta2",
  description:
    "You can lock names now!",
  changelog: [
    "Added the `namelock` and `unnamelock` commands and any logic required. - dunk",
    "⚠️ All updates have been halted for about a month, so I can study for finals 🫡 - kirbo",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
