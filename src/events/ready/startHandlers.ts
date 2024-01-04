import type { Client } from "discord.js";
import jobHandler from "../../handlers/jobHandler";

export default async (client: Client) => {
    // Event handler is obviously not here because it needs to trigger this event
    await jobHandler(client);
}