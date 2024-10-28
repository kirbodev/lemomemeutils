import {
  GuildTextBasedChannel,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  ApplicationCommandOptionType
} from "discord.js";
import type Command from "../../structures/commandInterface.js";
import configs from "../../config.js";
import { Action, Warn } from "../../db/index.js";

export default {
  name: "restore",
  description:
    "!!! DANGER !!! Restores DB entries from logs. Only available to developers.",
  devOnly: true,
  otpRequired: true,
  options: [{
     type: ApplicationCommandOptionType.String,
name: "message_id",
description: "The message ID to start from",
required: true
}],
  async slash(
    ogInteraction: ChatInputCommandInteraction,
    interaction: ModalSubmitInteraction | ChatInputCommandInteraction
  ) {
    if (!interaction) interaction = ogInteraction;
const messageId = interaction.options.getString("message_id", true)
    await interaction.reply(
      "You have just requested to fetch every log message and restore the entries to the database. This is dangerous, may lead to data loss and very high database usage. Do not perform this if you do not what you are doing. You have 10 seconds to cancel this action by restarting the bot, please run /restart to do this."
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await interaction.followUp(
      "Restoring entries... You will receive an update every 100 entries."
    );
    const config = configs.get(interaction.guildId!)!;
    const logChannelID = config.logChannelID;
    if (!logChannelID)
      return interaction.followUp("No log channel set up, aborting.");
    const logChannel = interaction.guild?.channels.cache.get(
      logChannelID
    ) as GuildTextBasedChannel;
    if (!logChannel)
      return interaction.followUp("Log channel not found, aborting.");
    let messages = await logChannel.messages
      .fetch({ limit: 100, after: messageId })
      .then((messages) => (messages.size ? messages : null));
    if (!messages)
      return interaction.followUp(
        "No messages found in log channel, aborting."
      );

    let completed = 0;
    let startTime = Date.now();
    const realStartTime = Date.now();
    let realCompleted = 0;
    while (messages) {
      for (const message of messages.values()) {
        // Do something with the message
        if (message.author.id !== interaction.client.user!.id) continue;
        if (!message.embeds.length) continue;
        const embed = message.embeds[0];
        const type = embed.title;
        if (!type) continue;
        if (
          type !== "Warned" &&
          type !== "Unwarned" &&
          type !== "Banned" &&
          type !== "Unbanned" &&
          type !== "Muted" &&
          type !== "Unmuted" &&
          type !== "Kicked"
        )
          continue;
        if (!embed.fields.length) continue;
        if (!embed.description?.length) continue;
        const reason =
          embed.description.split("`")[1]?.split("`")[0] ||
          embed.fields.find((field) => field.name === "Reason")?.value;
        if (!reason) continue;
        const user = embed.description.split("<@")[1]?.split(">")[0];
        if (!user) continue;
        if (!embed.footer || !embed.footer.iconURL) continue;
        const staff = embed.footer.iconURL.split("avatars/")[1]?.split("/")[0];
        if (!staff) continue;

        if (type === "Warned") {
          const existingWarn = await Warn.findOne({
            guildID: interaction.guildId!,
            userID: user,
            timestamp: {
              $gte: message.createdAt.getTime() - 10000,
              $lte: message.createdAt.getTime() + 10000,
            },
          });
          if (existingWarn) continue;
          const severity = embed.fields.find(
            (field) => field.name === "Severity"
          )?.value;
          if (!severity) continue;
          const mute = embed.fields.find(
            (field) => field.name === "Mute expires"
          )?.value;
          if (!mute) continue;
          const muteDate =
            mute === "Not muted"
              ? null
              : new Date(mute.split("<t:")[1].split(":")[0] + "000");
          const warn = new Warn({
            guildID: interaction.guildId!,
            userID: user,
            moderatorID: staff,
            reason,
            timestamp: message.createdAt.getTime(),
            severity: severity === "Light" ? 1 : 2,
            muteExpires: muteDate,
            expiresAt:
              severity === "Light"
                ? new Date(
                    message.createdAt.getTime() + 1000 * 60 * 60 * 24 * 3
                  )
                : new Date(
                    message.createdAt.getTime() + 1000 * 60 * 60 * 24 * 6
                  ),
          });
          await warn.save();
        } else if (type === "Unwarned") {
          const warnInfo = embed.fields.find(
            (field) => field.name === "Warn Info"
          )?.value;
          if (!warnInfo) continue;
          const expiresAtTimestamp = warnInfo.split("<t:")[1]?.split(":")[0];
          if (!expiresAtTimestamp) continue;
          const expiresAt = new Date(parseInt(expiresAtTimestamp + "000"));
          const warn = await Warn.findOne({
            guildID: interaction.guildId!,
            userID: user,
            expiresAt: {
              $gte: expiresAt.getTime() - 10000,
              $lte: expiresAt.getTime() + 10000,
            },
          });
          if (!warn) continue;
          if (warn.unwarn) continue;
          warn.unwarn = {
            moderatorID: staff,
            timestamp: message.createdAt,
            reason,
          };
          await warn.save();
        } else if (type === "Banned") {
          const existingBan = await Action.findOne({
            actionType: "ban",
            guildID: interaction.guildId!,
            userID: user,
            timestamp: {
              $gte: message.createdAt.getTime() - 10000,
              $lte: message.createdAt.getTime() + 10000,
            },
          });
          if (existingBan) continue;
          const parole = embed.fields.find(
            (field) => field.name === "Parole"
          )?.value;
          if (!parole) continue;
          const ban = new Action({
            actionType: "ban",
            guildID: interaction.guildId!,
            userID: user,
            moderatorID: staff,
            reason,
            withParole: parole === "Yes",
            timestamp: message.createdAt.getTime(),
          });
          await ban.save();
        } else if (type === "Unbanned") {
          const existingUnban = await Action.findOne({
            actionType: "unban",
            guildID: interaction.guildId!,
            userID: user,
            timestamp: {
              $gte: message.createdAt.getTime() - 10000,
              $lte: message.createdAt.getTime() + 10000,
            },
          });
          if (existingUnban) continue;
          const unban = new Action({
            actionType: "unban",
            guildID: interaction.guildId!,
            userID: user,
            moderatorID: staff,
            reason,
            timestamp: message.createdAt.getTime(),
          });
          await unban.save();
          const existingBan = await Action.findOne({
            actionType: "ban",
            guildID: interaction.guildId!,
            userID: user,
          }).sort({ timestamp: -1 });
          if (!existingBan) continue;
          existingBan.forceExpired = true;
          await existingBan.save();
        } else if (type === "Muted") {
          const existingMute = await Action.findOne({
            actionType: "mute",
            guildID: interaction.guildId!,
            userID: user,
            timestamp: {
              $gte: message.createdAt.getTime() - 10000,
              $lte: message.createdAt.getTime() + 10000,
            },
          });
          if (existingMute) continue;
          const expires = embed.fields.find(
            (field) => field.name === "Expires"
          )?.value;
          if (!expires) continue;
          const expiresDate =
            expires === "Never"
              ? null
              : new Date(
                  parseInt(expires.split("<t:")[1].split(":")[0] + "000")
                );
          const mute = new Action({
            actionType: "mute",
            guildID: interaction.guildId!,
            userID: user,
            moderatorID: staff,
            reason,
            timestamp: message.createdAt.getTime(),
            expiresAt: expiresDate,
          });
          await mute.save();
        } else if (type === "Unmuted") {
          const existingUnmute = await Action.findOne({
            actionType: "unmute",
            guildID: interaction.guildId!,
            userID: user,
            timestamp: {
              $gte: message.createdAt.getTime() - 10000,
              $lte: message.createdAt.getTime() + 10000,
            },
          });
          if (existingUnmute) continue;
          const unmute = new Action({
            actionType: "unmute",
            guildID: interaction.guildId!,
            userID: user,
            moderatorID: staff,
            reason,
            timestamp: message.createdAt.getTime(),
          });
          await unmute.save();
          const existingMute = await Action.findOne({
            actionType: "mute",
            guildID: interaction.guildId!,
            userID: user,
          }).sort({ timestamp: -1 });
          if (!existingMute) continue;
          existingMute.forceExpired = true;
          await existingMute.save();
        } else if (type === "Kicked") {
          const existingKick = await Action.findOne({
            actionType: "kick",
            guildID: interaction.guildId!,
            userID: user,
            timestamp: {
              $gte: message.createdAt.getTime() - 10000,
              $lte: message.createdAt.getTime() + 10000,
            },
          });
          if (existingKick) continue;
          const kick = new Action({
            actionType: "kick",
            guildID: interaction.guildId!,
            userID: user,
            moderatorID: staff,
            reason,
            timestamp: message.createdAt.getTime(),
          });
          await kick.save();
        } else continue;
        completed++;
        realCompleted++;
      }
      messages = await logChannel.messages
        .fetch({ limit: 100, after: messages.firstKey() })
        .then((messages) => (messages.size ? messages : null));
      if (!messages) break;
      interaction.followUp(
        `Out of ${messages.size}, restored ${completed} entries. Time taken: ${(
          (Date.now() - startTime) /
          1000
        ).toFixed(2)}s`
      );
      completed = 0;
      startTime = Date.now();
    }
    interaction.followUp(
      `Restore complete. Restored ${realCompleted} entries.
       Time taken: ${((Date.now() - realStartTime) / 1000).toFixed(2)}s`
    );
  },
} as Command;
