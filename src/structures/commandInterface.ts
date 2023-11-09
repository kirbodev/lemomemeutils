import type { ApplicationCommandOptionData, Interaction } from "discord.js";

export default interface Command {
    name: string,
    description: string,
    options?: ApplicationCommandOptionData[],
    devOnly?: boolean,
    testOnly?: boolean,
    permissionsRequired?: bigint[],
    cooldown?: number,
    execute: (interaction: Interaction) => void
}