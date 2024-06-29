import { Client, Message } from "discord.js";
import handleMessageCommands from "../messageCreate/handleMessageCommands.js";
import getLocalCommands from "../../helpers/getLocalCommands.js";
import configs from "../../config.js";

export default async (
  client: Client,
  oldMessage: Message,
  message: Message
) => {
  if (process.env.EDIT_COMMANDS_KILL_SIGNAL) return;
  if (!message.guild) return;
  const config = configs.get(message.guild.id);
  if (!config) return;
  const prefix = config?.prefix || ",";
  const localCommands = await getLocalCommands();
  let command = localCommands.find(
    (command) =>
      command.name === oldMessage.content.slice(prefix.length).split(" ")[0]
  );
  if (command) return;
  command = localCommands.find((command) =>
    command.aliases?.includes(
      oldMessage.content.slice(prefix.length).split(" ")[0]
    )
  );
  if (command) return;
  message = await message.fetch().catch();
  handleMessageCommands(client, message);
};
