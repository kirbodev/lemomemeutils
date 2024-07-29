import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  Message,
  User,
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import {
  GuildMember,
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
} from "discord.js";
import EmbedColors from "../../structures/embedColors.js";
import Errors from "../../structures/errors.js";
import safeEmbed from "../../utils/safeEmbed.js";
import { setNameLock, getNameLock } from "../../db/models/namelock";

const monitorUsernameChange = async (guildId: string, userId: string, interaction: ChatInputCommandInteraction) => {
  const nameLock = await getNameLock(guildId, userId);
  if (!nameLock) return;

  const member = await interaction.guild?.members.fetch(userId);
  if (member && member.nickname !== nameLock.lockedName) {
    await member.setNickname(nameLock.lockedName);
  }
};

export default {
  name: "namelock",
  description: "Lock a user's username in the server to a specified name.",
  options: [
    {
      name: "user",
      description: "The user to lock the name for",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "name",
      description: "The name to lock",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  aliases: ["nl"],
  syntax: "prefixnl <user> <name>",
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageNicknames],
  contextName: "Lock username",
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
    const name = interaction.options.getString("name")!;
    const guildId = interaction.guildId!;
    const userId = user.id;

    const member = interaction.guild!.members.cache.get(user.id) as GuildMember;

    if (!member) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
              .setDescription(`<@${user.id}> is not a member of this server.`)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }
    if (member.id === interaction.client.user.id) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBot)
              .setDescription("What have I done wrong? :(")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }
    if (
      member.roles.highest.position >=
        (interaction.member?.roles as GuildMemberRoleManager).highest
          .position &&
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)
    ) {
      return interaction.followUp({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorAuthority)
              .setDescription(
                `<@${member.id}>'s highest role is <@&${
                  member.roles.highest.id
                }> (Position: ${
                  member.roles.highest.position
                }), which is higher or equal to your highest role. (Position: ${
                  (interaction.member?.roles as GuildMemberRoleManager).highest
                    .position
                })`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
        ephemeral: true,
      });
    }

    await setNameLock(guildId, userId, name);

    await member.setNickname(name);
    interaction.followUp({
      content: `Locked ${user.username}'s name to ${name}`,
      ephemeral: true,
    });

    setInterval(() => monitorUsernameChange(guildId, userId, interaction), 60000);
  },
  message: async (message: Message, { alias, args }) => {
    args = args ?? [];
    if (args.length < 2) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorSyntax)
              .setDescription(
                `The correct syntax for this command is:\n \`\`\`${message.client.prefix}${alias} <user> <name>\`\`\``
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }

    const rawUser = args[0];
    let user: User;
    try {
      user = await message.client.users.fetch(rawUser.replace(/[<@!>]/g, ""));
    } catch (e) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUserNotFound)
              .setDescription("Please provide a valid user.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }

    const name = args.slice(1).join(" ");
    const guildId = message.guildId!;
    const userId = user.id;

    const member = message.guild!.members.cache.get(user.id) as GuildMember;

    if (!member) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
              .setDescription(`<@${user.id}> is not a member of this server.`)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }
    if (member.id === message.client.user.id) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorBot)
              .setDescription("What have I done wrong? :(")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }
    if (
      member.roles.highest.position >=
        (message.member?.roles as GuildMemberRoleManager).highest
          .position &&
      !message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorAuthority)
              .setDescription(
                `<@${member.id}>'s highest role is <@&${
                  member.roles.highest.id
                }> (Position: ${
                  member.roles.highest.position
                }), which is higher or equal to your highest role. (Position: ${
                  (message.member?.roles as GuildMemberRoleManager).highest
                    .position
                })`
              )
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
          ),
        ],
      });
    }

    await setNameLock(guildId, userId, name);

    await member.setNickname(name);
    message.reply({
      content: `Locked ${user.username}'s name to ${name}`,
    });

    setInterval(() => monitorUsernameChange(guildId, userId, message), 60000);
  },
} as Command;
