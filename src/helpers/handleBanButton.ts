import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ContextMenuCommandInteraction, EmbedBuilder, GuildMember, Message, PermissionFlagsBits, User } from "discord.js";
import { nanoid } from "nanoid";
import banMember from "./banMember";
import Errors from "../structures/errors";
import EmbedColors from "../structures/embedColors";
import configs from "../config";

export default function getBanButton(interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction | Message, user: User, reason: string) {
    const id = nanoid();
    handleBanButton(id, interaction, user, reason);
    return new ButtonBuilder()
        .setCustomId(id)
        .setLabel("Ban")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔨")
}

async function handleBanButton(id: string, interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction | Message, user: User, reason: string) {
    let mod;
    if (interaction instanceof Message) {
        mod = interaction.author;
    } else {
        mod = interaction.user;
    }
    const config = configs.get(interaction.guildId!)!;
    try {
        const button = await interaction.channel?.awaitMessageComponent({
            filter: (i) => i.customId === id && i.memberPermissions.has(PermissionFlagsBits.ManageRoles),
            time: 1000 * 60 * 5,
        }) as ButtonInteraction;

        const ban = await banMember(user, reason, interaction.member as GuildMember);
        if (!ban.success) {
            return button.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(Errors.ErrorUserBanned)
                        .setDescription(`Something went wrong while banning <@${user.id}>, they are likely already banned.`)
                        .setColor(EmbedColors.error)
                        .setFooter({
                            text: `Requested by ${mod.tag}`,
                            iconURL: mod.displayAvatarURL()
                        })
                        .setTimestamp(Date.now())
                ],
                ephemeral: true
            });
        }
        const embed = new EmbedBuilder()
            .setTitle("Banned")
            .setDescription(`Banned <@${user.id}> for \`${reason}\` (via ban button). ${ban.dmSent ? "They have been notified." : "They could not be notified."}`)
            .setFields([
                {
                    name: "Parole",
                    value: `No`,
                },
                {
                    name: "Expires",
                    value: `Never`,
                },
            ])
            .setColor(EmbedColors.success)
            .setFooter({
                text: `Requested by ${button.user.tag}`,
                iconURL: button.user.displayAvatarURL()
            })
            .setTimestamp(Date.now())
        if (interaction.channel !== config.logChannel) config.log({ embeds: [embed] });
        return button.reply({
            embeds: [embed]
        })
    } catch (err) {
        return;
    }
}