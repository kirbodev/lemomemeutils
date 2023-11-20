import type { ApplicationCommandOptionData, ContextMenuCommandInteraction, Interaction, Message } from "discord.js";

export default interface Command {
    name: string,
    description: string,
    options?: ApplicationCommandOptionData[],
    devOnly?: boolean,
    testOnly?: boolean,
    permissionsRequired?: bigint[],
    cooldown?: number,
    aliases?: string[],
    slash: (interaction: Interaction) => void
    message?: (interaction: Message, alias?: string) => void,
    contextMenu?: (interaction: ContextMenuCommandInteraction) => void
}