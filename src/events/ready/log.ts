import type { Client } from "discord.js";

export default (client: Client) => {
    console.log(`Logged in as ${client.user?.username}!`);
}