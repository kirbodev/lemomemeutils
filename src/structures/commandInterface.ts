import type { ApplicationCommandOptionData, Interaction } from "discord.js";

export default interface Command {
    name: string,
    description: string,
    options?: ApplicationCommandOptionData[],
    devOnly?: boolean,
    testOnly?: boolean,
    permissionsRequired?: bigint[],
    cooldown?: number,
    slash: (interaction: Interaction) => void
    // message: (interaction: Message) => void,
    // contextMenu: (interaction: ContextMenuCommandInteraction) => void
}