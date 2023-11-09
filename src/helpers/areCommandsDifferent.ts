// Check if the properties of 2 commands are different

import type { ApplicationCommand } from "discord.js";
import type Command from "../structures/commandInterface";

export default (localCommand: Command, appCommand: ApplicationCommand) => {
    if (localCommand.name !== appCommand.name) return true;
    if (localCommand.description !== appCommand.description) return true;
    if (!localCommand.options && appCommand.options.length === 0) return false;
    if (localCommand.options !== appCommand.options) return true;
    return false;
}