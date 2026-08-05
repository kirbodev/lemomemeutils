import { type Client, type Interaction } from "discord.js";
import Fuse from "fuse.js";

const RECOMMENDED_AFK_MESSAGES = [
  "Be right back",
  "Away from keyboard",
  "In a meeting",
  "Eating",
  "Sleeping",
  "Busy",
  "On a call",
  "Taking a break",
  "Out for a walk",
  "At school",
  "At work",
  "Playing a game",
  "Watching a movie",
  "Doing homework",
];

const fuse = new Fuse(RECOMMENDED_AFK_MESSAGES, { threshold: 0.5 });

export default async (_client: Client, interaction: Interaction) => {
  if (!interaction.isAutocomplete()) return;

  if (interaction.commandName === "afk") {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== "message") return;

    const query = focusedOption.value;
    const results = query
      ? fuse.search(query).map((r) => r.item)
      : RECOMMENDED_AFK_MESSAGES;

    await interaction.respond(
      results.slice(0, 25).map((msg) => ({ name: msg, value: msg }))
    );
  }
};
