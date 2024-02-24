export default {
  name: "HOV Release",
  date: new Date(2024, 1, 24),
  version: "1.5.1",
  description: "Release for House of VOX.",
  changelog: ["Changed config and different features to work with HOV."],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
