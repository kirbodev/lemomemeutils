import type { Client } from "discord.js";

export default interface Job {
    every: string,
    dontRunOnStart?: boolean,
    execute: (client: Client) => Promise<string>
}