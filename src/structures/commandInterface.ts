/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIApplicationCommandOption, ChatInputCommandInteraction, ContextMenuCommandInteraction, Message, ModalSubmitInteraction } from "discord.js";

export default interface Command {
    name: string,
    description: string,
    options?: APIApplicationCommandOption[], // For some reason, the normal not API version is missing properties
    devOnly?: boolean,
    otpRequired?: boolean, // Will only return slash commands if true, use with devOnly
    testOnly?: boolean,
    permissionsRequired?: bigint[], 
    cooldown?: number,
    aliases?: string[], // Only works for message commands
    syntax?: string, // Use to override the default syntax inherited from the options property, will replace "prefix" with the actual prefix
    contextName?: string, // Set the context menu name
    slash: (interaction: ChatInputCommandInteraction, m?: ModalSubmitInteraction ) => void | Promise<any>,
    message?: (interaction: Message, alias?: string) => void | Promise<any>,
    contextMenu?: (interaction: ContextMenuCommandInteraction) => void | Promise<any>,
}