/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChatInputCommandInteraction,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import type { APIApplicationCommandOption } from "discord.js";
import Command from "./Command";
import { setNameLock, getNameLock } from "../../db/schemas/namelocks";

const monitorUsernameChange = async (
  guildId: string,
  userId: string,
  lockedName: string
) => {
  const member = await interaction.guild?.members.fetch(userId);
  if (member && member.nickname !== lockedName) {
    await member.setNickname(lockedName);
  }
};

const namelock: Command = {
  name: "namelock",
  description: "Lock a user's username in the server to a specified name.",
  options: [
    {
      name: "user",
      description: "The user to lock the name for",
      type: 6, // USER type
      required: true,
    },
    {
      name: "name",
      description: "The name to lock",
      type: 3, // STRING type
      required: true,
    },
  ] as APIApplicationCommandOption[],
  permissionsRequired: [PermissionFlagsBits.ManageNicknames],
  slash: async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser("user", true);
    const name = interaction.options.getString("name", true);
    const guildId = interaction.guildId!;
    const userId = user.id;

    // Store the locked name in the database
    await setNameLock(guildId, userId, name);

    // Change the user's nickname
    const member = await interaction.guild?.members.fetch(userId);
    if (member) {
      await member.setNickname(name);
      interaction.reply({
        content: `Locked ${user.username}'s name to ${name}`,
        ephemeral: true,
      });
    } else {
      interaction.reply({ content: "User not found in the server.", ephemeral: true });
    }

    // Set up a periodic check to ensure the name stays locked
    setInterval(() => monitorUsernameChange(guildId, userId, name), 60000); // Check every 60 seconds
  },
  message: async (
    message: Message,
    { alias, args }: { alias: string; args?: string[] }
  ) => {
    if (!message.guild || !args || args.length < 2) {
      message.reply("You must specify a user and a name.");
      return;
    }

    const user = message.mentions.users.first() || (await message.client.users.fetch(args[0]));
    if (!user) {
      message.reply("User not found.");
      return;
    }

    const name = args.slice(1).join(" ");
    const guildId = message.guild.id;
    const userId = user.id;

    // Store the locked name in the database
    await setNameLock(guildId, userId, name);

    // Change the user's nickname
    const member = await message.guild.members.fetch(userId);
    if (member) {
      await member.setNickname(name);
      message.reply(`Locked ${user.username}'s name to ${name}`);
    } else {
      message.reply("User not found in the server.");
    }

    // Set up a periodic check to ensure the name stays locked
    setInterval(() => monitorUsernameChange(guildId, userId, name), 60000); // Check every 60 seconds
  },
};

export default namelock;
