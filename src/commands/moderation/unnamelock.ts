import { ChatInputCommandInteraction, GuildMemberRoleManager, Message, User } from "discord.js";
import type Command from "../../structures/commandInterface.js";
import { GuildMember, ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } from "discord.js";
import EmbedColors from "../../structures/embedColors.js";
import Errors from "../../structures/errors.js";
import safeEmbed from "../../utils/safeEmbed.js";
import { removeNameLock } from "../../db/models/namelocks";

export default {
  name: "unnamelock",
  description: "Unlock a user's locked username in the server.",
  options: [
    {
      name: "user",
      description: "The user to unlock the name for",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  aliases: ["unl"],
  syntax: "prefixunl <user>",
  cooldown: 10000,
  permissionsRequired: [PermissionsBitField.Flags.ManageNicknames],
  contextName: "Unlock username",
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user")!;
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

    await removeNameLock(guildId, userId);

    interaction.followUp({
      content: `Unlocked the name lock for ${user.username}`,
      ephemeral: true,
    });
  },
  message: async (message: Message, { alias, args }) => {
    args = args ?? [];
    if (args.length < 1) {
      return message.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorSyntax)
              .setDescription(
                `The correct syntax for this command is:\n \`\`\`${message.client.config.prefix}${alias} <user>\`\`\``
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

    await removeNameLock(guildId, userId);

    message.reply({
      content: `Unlocked the name lock for ${user.username}`,
    });
  },
} as Command;
