import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  ApplicationCommandOptionType,
  User,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import EmbedColors from "../../structures/embedColors.js";
import safeEmbed from "../../utils/safeEmbed.js";
import lazyMemberSearch from "../../utils/lazyMemberSearch.js";

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
    let user: User | null | undefined = rawUser
      ? await interaction.client.users
          .fetch(rawUser.replace(/[<@!>]/g, ""))
          .catch(() => null)
      : null;
    let embedDescription;
    if (!user && rawUser) {
      user = (await lazyMemberSearch(rawUser, interaction.guild!))?.user;
      if (user && interaction.author.id === "433826072002297856") {
        //angery
        embedDescription =
          '"nooo kirbo please dont remove dyno avatar i want to find random avatars"';
      }
    }
    if (!user) user = interaction.author;
    if (user.id === "433826072002297856")
      embedDescription = "⚠️ The user you are trying to find is stroking it ⚠️";
    const member = await interaction
      .guild!.members.fetch(user)
      .catch(() => null);

    await interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(`Avatar | ${user.tag}`)
            .setDescription(embedDescription ?? null)
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
