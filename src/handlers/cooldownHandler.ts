import getLocalCommands from "../helpers/getLocalCommands";

const cooldowns = new Map<string, Map<string, number>>();

const commands = await getLocalCommands();
export function setCooldown(userID: string, commandName: string) {
    if (!cooldowns.has(userID)) {
        cooldowns.set(userID, new Map());
    }
    const command = commands.find(c => c.name === commandName);
    if (!command) return;
    cooldowns.get(userID)!.set(commandName, Date.now() + (command.cooldown ?? 500));
}

export function getCooldown(userID: string, commandName: string) {
    if (!cooldowns.has(userID)) {
        cooldowns.set(userID, new Map());
    }
    return cooldowns.get(userID)!.get(commandName);
}