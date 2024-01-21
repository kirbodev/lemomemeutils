import { PermissionsBitField, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import os from "os-utils";
import ms from "ms";

export default {
    name: 'ping',
    description: 'Pong!',
    contextName: 'Ping!',
    cooldown: 10000,
    permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
    async slash(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        // Get some useful information
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = interaction.client.ws.ping;
        // Get nodejs server stats and make them look nice
        const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const uptime = ms(process.uptime() * 1000);
        // Turn os-utils into a promise (it's callback based), it doesnt use (err, data), it only uses (data)
        const cpuUsage = await new Promise((resolve) => {
            os.cpuUsage((v) => resolve(v));
        }) as unknown as number;

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Pong!')
                    .setFields([
                        {
                            name: 'Latency',
                            value: `${latency}ms`
                        },
                        {
                            name: 'API Latency',
                            value: `${apiLatency > 0 ? `${apiLatency}ms` : 'N/A'}`
                        },
                        {
                            name: 'CPU Usage',
                            value: `${cpuUsage.toFixed(2)}%`
                        },
                        {
                            name: 'Memory Usage',
                            value: `${memoryUsage}MB`
                        },
                        {
                            name: 'Uptime',
                            value: uptime
                        }
                    ])
                    .setColor(EmbedColors.info)
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp(Date.now())
            ]
        });
    },
    async message(interaction: Message) {
        // Get some useful information
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = interaction.client.ws.ping;
        // Get nodejs server stats and make them look nice
        const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const uptime = ms(process.uptime() * 1000);
        // Turn os-utils into a promise (it's callback based), it doesnt use (err, data), it only uses (data)
        const cpuUsage = await new Promise((resolve) => {
            os.cpuUsage((v) => resolve(v));
        }) as unknown as number;

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Pong!')
                    .setFields([
                        {
                            name: 'Latency',
                            value: `${latency}ms`
                        },
                        {
                            name: 'API Latency',
                            value: `${apiLatency > 0 ? `${apiLatency}ms` : 'N/A'}`
                        },
                        {
                            name: 'CPU Usage',
                            value: `${cpuUsage.toFixed(2)}%`
                        },
                        {
                            name: 'Memory Usage',
                            value: `${memoryUsage}MB`
                        },
                        {
                            name: 'Uptime',
                            value: uptime
                        }
                    ])
                    .setColor(EmbedColors.info)
                    .setFooter({
                        text: `Requested by ${interaction.author.tag}`,
                        iconURL: interaction.author.displayAvatarURL()
                    })
                    .setTimestamp(Date.now())
            ]
        });
    },
} as Command;
