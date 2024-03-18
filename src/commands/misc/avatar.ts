import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  ApplicationCommandOptionType,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import safeEmbed from "../../utils/safeEmbed";

export default {
  name: "avatar",
  description: "Get the avatar of a user.",
  aliases: ["av"],
  options: [
    {
      name: "user",
      description: "The user to get the avatar of.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  permissionsRequired: [PermissionsBitField.Flags.SendMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser("user", false) || interaction.user;
    const member = await interaction
      .guild!.members.fetch(user)
      .catch(() => null);
    await interaction.editReply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(`Avatar | ${user.tag}`)
            .setImage(
              member?.displayAvatarURL({
                size: 4096,
              }) ??
                user.displayAvatarURL({
                  size: 4096,
                })
            )
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp()
        ),
      ],
    });
  },
  async message(interaction: Message, { args }) {
    args = args ?? [];
    const rawUser = args[0];
    const user = rawUser
      ? (await interaction.client.users
          .fetch(rawUser.replace(/[<@!>]/g, ""))
          .catch(() => null)) || interaction.author
      : interaction.author;
    const member = await interaction
      .guild!.members.fetch(user)
      .catch(() => null);

    await interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(`Avatar | ${user.tag}`)
            .setImage(
              member?.displayAvatarURL({
                size: 4096,
              }) ??
                user.displayAvatarURL({
                  size: 4096,
                })
            )
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp()
        ),
      ],
    });
  },
} as Command;
