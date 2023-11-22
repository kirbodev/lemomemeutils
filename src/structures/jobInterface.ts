import type { Client } from "discord.js";

export default interface Job {
    every: string,
    execute: (client: Client) => Promise<string> | string
}