import { Client, EmbedBuilder, GuildMember, Interaction } from "discord.js";
import Errors from "../../structures/errors";
import EmbedColors from "../../structures/embedColors";
import configs from "../../config";
import safeEmbed from "../../utils/safeEmbed";
import banMember from "../../helpers/banMember";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("ban-")) return;
  const userid = interaction.customId.split("-")[1];
  const user = await client.users.fetch(userid);
  const reason =
    interaction.customId.split("-").slice(2).join(" ") || "No reason provided";
  const config = configs.get(interaction.guildId!)!;
  const mod = interaction.user;

  const ban = await banMember(user, reason, interaction.member as GuildMember);
  if (!ban.success) {
    return interaction.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorUserBanned)
            .setDescription(
              `Something went wrong while banning <@${user.id}>, they are likely already banned.`
            )
            .setColor(EmbedColors.error)
            .setFooter({
              text: `Requested by ${mod.tag}`,
              iconURL: mod.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        ),
      ],
      ephemeral: true,
    });
  }
  const embed = safeEmbed(
    new EmbedBuilder()
      .setTitle("Banned")
      .setDescription(
        `Banned <@${user.id}> for \`${reason}\` (via ban button). ${
          ban.dmSent
            ? "They have been notified."
            : "They could not be notified."
        }`
      )
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
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp(Date.now())
  );
  if (interaction.channel !== config.logChannel)
    config.log({ embeds: [embed] });
  return interaction.reply({
    embeds: [embed],
  });
};
