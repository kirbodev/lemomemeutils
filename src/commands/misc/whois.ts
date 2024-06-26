import {
  PermissionsBitField,
  EmbedBuilder,
  GuildMember,
  User,
  ApplicationCommandOptionType,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import EmbedColors from "../../structures/embedColors.js";
import Errors from "../../structures/errors.js";
import KV from "../../db/models/kv.js";
import kvInterface from "../../structures/kvInterface.js";
import { HydratedDocument } from "mongoose";
import { devs } from "../../config.js";
import safeEmbed from "../../utils/safeEmbed.js";

export default {
  name: "whois",
  description:
    "Get information about a user, or the user who sent a specific bot message.",
  choices: [
    {
      name: "user",
      description: "The user to get information about.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  cooldown: 5000,
  async message(interaction, { args }) {
    args = args ?? [];
    const rawUser = args[0];
    const wuser = rawUser
      ? await interaction.client.users
          .fetch(rawUser.replace(/[<@!>]/g, ""))
          .catch(() => null)
      : interaction.author;
    if (!wuser) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotFound)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }
    const member = (await interaction.guild?.members
      .fetch(wuser.id)
      .catch(() => null)) as GuildMember | null;

    if (rawUser) {
      return interaction.reply({
        embeds: [getUserInfo(wuser, member, interaction.author.tag)],
      });
    }

    if (!interaction.reference) {
      return interaction.reply({
        embeds: [getUserInfo(wuser, member, interaction.author.tag)],
      });
    }

    const ref = await interaction.fetchReference();
    if (ref.author.id === interaction.client.user.id) {
      if (ref.embeds.length > 0) {
        return interaction.reply({
          embeds: [getUserInfo(wuser, member, interaction.author.tag)],
        });
      }

      const author: HydratedDocument<kvInterface> | null = await KV.findOne({
        key: `botmsg-${interaction.reference.messageId}`,
      });
      if (!author) {
        const embed = safeEmbed(
          new EmbedBuilder()
            .setTitle("Whois | Genuine")
            .setDescription(
              "This is a genuine bot message. It was not sent by a user."
            )
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${interaction.author.tag}`,
              iconURL: interaction.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now())
        );
        return interaction.reply({
          embeds: [embed],
        });
      }
      if (author.value === "ai") {
        return interaction.reply({
          embeds: [
            safeEmbed(
              new EmbedBuilder()
                .setTitle("Whois")
                .setDescription("I am sentient. I sent this message.")
                .setFields([
                  {
                    name: "AI",
                    value:
                      'Pssss... this message was sent by an AI. It could be inaccurate, offensive or inappropriate. You can activate the AI by pinging the bot when the bot is in chat, which happens at random, this could be seen by a "hi" message or similar.',
                  },
                ])
                .setColor(EmbedColors.info)
                .setFooter({
                  text: `Requested by ${interaction.author.tag}`,
                  iconURL: interaction.author.displayAvatarURL(),
                })
                .setTimestamp(Date.now())
            ),
          ],
        });
      }
      const identify = interaction.member?.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      );

      const user = await interaction.guild?.members.fetch(author.value);
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle("Whois")
              .setDescription(
                identify
                  ? `This message was sent by <@${author.value}> (${
                      user?.user.tag || "Unknown name"
                    }).`
                  : "This message was sent by a user. You don't have permission to see their information."
              )
              .setColor(EmbedColors.info)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    } else {
      return interaction.reply({
        embeds: [getUserInfo(wuser, member, interaction.author.tag)],
      });
    }
  },
} as Command;

function getUserInfo(user: User, member: GuildMember | null, author: string) {
  const embed = safeEmbed(
    new EmbedBuilder()
      .setTitle(`Whois | ${user.username}`)
      .setColor(EmbedColors.info) // Using standardized color for informational embeds
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "Username", value: user.username, inline: true },
        { name: "ID", value: user.id, inline: true },
        { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
        {
          name: "Account Creation Date",
          value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}>`,
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${author}`,
        iconURL: user.displayAvatarURL(),
      })
      .setTimestamp(Date.now())
  );

  if (member) {
    embed.addFields(
      {
        name: "Server Join Date",
        value: member.joinedAt
          ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}>`
          : "Unknown",
        inline: true,
      },
      {
        name: "Top Role",
        value: `<@&${member.roles.highest.id}>`,
        inline: true,
      }
    );

    const permissions = member.permissions;
    let acknowledgment = "";
    if (permissions.has(PermissionsBitField.Flags.Administrator)) {
      acknowledgment = "👑 Server Administrator";
    } else if (permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      acknowledgment = "🛡️ Server Moderator";
    }
    if (acknowledgment) {
      embed.addFields({
        name: "Server Acknowledgment",
        value: acknowledgment,
        inline: true,
      });
    }

    let badges = "";
    // Custom emoji IDs should be replaced with actual IDs for your server's emojis
    if (member.user.flags) {
      badges += member.user.flags.has("Staff")
        ? "<:discordstaff:1068511449435095041> "
        : "";
      badges += member.user.flags.has("Partner")
        ? "<:partneredserverowner:1068511407496237057> "
        : "";
      badges += member.user.flags.has("Hypesquad")
        ? "<:hypeevents:1068511704775929886> "
        : "";
      badges += member.user.flags.has("BugHunterLevel1")
        ? "<:bughunterlvl1:1068513308522586142> "
        : "";
      badges += member.user.flags.has("PremiumEarlySupporter")
        ? "<:earlysupporter:1067806458604957727> "
        : "";
      badges += member.user.flags.has("TeamPseudoUser")
        ? "<:teamsuser:1213180939467890798> "
        : "";
      badges += member.user.flags.has("BugHunterLevel2")
        ? "<:bughunterlvl2:1068511656780500992> "
        : "";
      badges += member.user.flags.has("VerifiedBot")
        ? "<:verbot:1213180092142846083> "
        : "";
      badges += member.user.flags.has("VerifiedDeveloper")
        ? "<:earlyverifiedbotdev:1069940775833583626> "
        : "";
      badges += member.user.flags.has("ActiveDeveloper")
        ? "<:activedev:1069940746460872794> "
        : "";
      badges += devs.includes(member.id)
        ? "<:pomegranateActiveDev:1234596563322409101> "
        : "";
    }
    if (badges.length > 0) {
      embed.addFields({ name: "Badges", value: badges, inline: true });
    }
  }

  return embed;
}
