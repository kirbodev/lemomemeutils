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
  
  export default {
    name: "banner",
    description: "Get the banner of a user.",
    aliases: ["bn"],
    options: [
      {
        name: "user",
        description: "The user to get the banner of.",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    permissionsRequired: [PermissionsBitField.Flags.SendMessages],
    async slash(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });
      let user = interaction.options.getUser("user", false) || interaction.user;
      user = await user.fetch();

      await interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(`Banner | ${user.tag}`)
              .setDescription(!user.banner ? "This user does not have a banner." : "Server banners are not supported because Discord does not provide an API for them. You can help by voting for [this suggestion](https://github.com/discord/discord-api-docs/discussions/4217).")
              .setImage(
                  user.bannerURL({
                    size: 4096,
                  }) ?? null
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
            .fetch(rawUser.replace(/[<@!>]/g, ""), {
              force: true,
            })
            .catch(() => null)
        : null;
      if (!user) user = interaction.author;
  
      await interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(`Banner | ${user.tag}`)
              .setDescription(!user.banner ? "This user does not have a banner." : "Server banners are not supported because Discord does not provide an API for them. You can help by voting for [this suggestion](https://github.com/discord/discord-api-docs/discussions/4217).")
              .setImage(
                  user.bannerURL({
                    size: 4096,
                  }) ?? null
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