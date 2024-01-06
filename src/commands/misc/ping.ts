import { PermissionsBitField, type ChatInputCommandInteraction, type ContextMenuCommandInteraction, type Message } from "discord.js";
import type Command from "../../structures/commandInterface";
import os from 'os';

export default {
    name: 'debug',
    description: 'Check bot latency and debug info',
    contextName: 'Debug!',
    cooldown: 30000,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    async slash(interaction: ChatInputCommandInteraction) {
        const startTime = Date.now();
        await interaction.reply('Pinging...');
        const endTime = Date.now();
        const latency = endTime - startTime;

        const uptime = process.uptime();
        const cpuUsage = process.cpuUsage().user / 1000000; // Convert to seconds
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // Convert to MB
        const diskUsage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2);

        interaction.editReply(`Pong! Latency: ${latency}ms\nUptime: ${uptime}s\nCPU Usage: ${cpuUsage}s\nRAM Usage: ${ramUsage}MB\nDisk Usage: ${diskUsage}%`);
    },
    async message(interaction: Message) {
        const startTime = Date.now();
        await interaction.reply('Pinging...');
        const endTime = Date.now();
        const latency = endTime - startTime;

        const uptime = process.uptime();
        const cpuUsage = process.cpuUsage().user / 1000000; // Convert to seconds
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // Convert to MB
        const diskUsage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2);

        interaction.editReply(`Pong! Latency: ${latency}ms\nUptime: ${uptime}s\nCPU Usage: ${cpuUsage}s\nRAM Usage: ${ramUsage}MB\nDisk Usage: ${diskUsage}%`);
    },
    async contextMenu(interaction: ContextMenuCommandInteraction) {
        const startTime = Date.now();
        await interaction.reply('Pinging...');
        const endTime = Date.now();
        const latency = endTime - startTime;

        const uptime = process.uptime();
        const cpuUsage = process.cpuUsage().user / 1000000; // Convert to seconds
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // Convert to MB
        const diskUsage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2);

        interaction.editReply(`Pong! Latency: ${latency}ms\nUptime: ${uptime}s\nCPU Usage: ${cpuUsage}s\nRAM Usage: ${ramUsage}MB\nDisk Usage: ${diskUsage}%`);
    }
} as Command;