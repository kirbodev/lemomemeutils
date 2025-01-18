import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  PermissionsBitField,
} from "discord.js";
import Errors from "../../structures/errors.js";
import EmbedColors from "../../structures/embedColors.js";
import { Action, Warn } from "../../db";
import Analytics from "../../db/models/analytics.js";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import ms from "ms";

interface ChoppedData {
  userId: string;
  statistics: {
    usageCount: number;
    favoriteCommand: string | null;
    commandUsage: Record<string, number>;
    favoriteType: "slash" | "message";
    favoriteTypePercent: number;
    dailyUsageCount: number; // max 365
    highestDailyStreak: number;
    moderation: {
      warns: number;
      warnPercentile: number;
      unwarns: number;
      heavies: number;
      mutes: number;
      muteTime: number;
      longestMute: number;
      kicks: number;
      bans: number;
    };
    enemy?: {
      username?: string;
      id: string;
      warns: number;
      actions: number;
    };
    badges?: string[];
  };
}

const warns = await Warn.find({
  timestamp: {
    $gte: new Date(2024, 0, 1),
    $lt: new Date(2024, 11, 6),
  },
});
const warnCounts: Record<string, number> = {};

warns.forEach((warn) => {
  const userId = warn.userID;
  warnCounts[userId] = (warnCounts[userId] || 0) + 1;
});

// Calculate total users for percentile calculation
const totalUsers = Object.keys(warnCounts).length;

// Function to get warn percentile
function getWarnPercentile(userId: string): number {
  const userWarns = warnCounts[userId] || 0;
  let usersBelow = 0;

  // Count how many users have fewer warns
  Object.values(warnCounts).forEach((count) => {
    if (count < userWarns) {
      usersBelow++;
    }
  });

  // Calculate percentile (users with fewer warns / total users * 100)
  return Math.round((usersBelow / totalUsers) * 100);
}

export default {
  name: "chopped",
  description:
    "[Limited] Take a look back at this year and get your chopped review",
  cooldown: 60000,
  permissionsRequired: [PermissionsBitField.Flags.SendMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    this.run(interaction);
  },
  async message(message: Message) {
    this.run(message);
  },
  async run(i: ChatInputCommandInteraction | Message) {
    const user = i instanceof Message ? i.author : i.user;
    const member =
      i instanceof Message ? i.member : i.guild?.members.cache.get(user.id);
    const year = new Date().getUTCFullYear();
    const month = new Date().getUTCMonth();
    // if its not 2024 and its not january
    if (year !== 2024 && month !== 0) {
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(Errors.ErrorUser)
            .setDescription(
              "Sorry but Chopped is gone for the year. Come back next december!"
            )
            .setColor(EmbedColors.info)
            .setTimestamp(),
        ],
      });
    }

    // Gather data

    const data: ChoppedData = {
      userId: user.id,
      statistics: {
        usageCount: 0,
        favoriteCommand: "",
        commandUsage: {},
        favoriteType: "slash",
        favoriteTypePercent: 0,
        dailyUsageCount: 0,
        highestDailyStreak: 0,
        moderation: {
          warns: 0,
          warnPercentile: 0,
          unwarns: 0,
          heavies: 0,
          mutes: 0,
          muteTime: 0,
          longestMute: 0,
          kicks: 0,
          bans: 0,
        },
      },
    };

    const analytics = await Analytics.find({
      userID: user.id,
      timestamp: {
        $gte: new Date(2024, 0, 1),
        $lt: new Date(2024, 11, 25),
      },
    }).sort({
      timestamp: 1,
    });
    const actions = await Action.find({
      userID: user.id,
      timestamp: {
        $gte: new Date(2024, 0, 1),
        $lt: new Date(2024, 11, 25),
      },
    }).sort({
      timestamp: 1,
    });
    const warns = await Warn.find({
      userID: user.id,
      timestamp: {
        $gte: new Date(2024, 0, 1),
        $lt: new Date(2024, 11, 25),
      },
    }).sort({ timestamp: 1 });

    // process analytics
    let usedMsg = 0;
    let usedSlash = 0;
    let dailyStreak = 0;
    let lastDay = 0;
    let dayCounted = 0;

    for (const analytic of analytics) {
      if (analytic.type === "command" || analytic.type === "message") {
        data.statistics.usageCount++;
        data.statistics.commandUsage[analytic.name] = data.statistics
          .commandUsage[analytic.name]
          ? data.statistics.commandUsage[analytic.name] + 1
          : 1;
        if (analytic.type === "command") usedSlash++;
        if (analytic.type === "message") usedMsg++;
      }

      // daily streak
      if (analytic.timestamp) {
        // get day of year
        const day = Math.floor(
          (analytic.timestamp.getTime() -
            new Date(analytic.timestamp.getFullYear(), 0, 0).getTime()) /
            1000 /
            60 /
            60 /
            24
        );

        if (day !== dayCounted) {
          dayCounted = day;
          data.statistics.dailyUsageCount++;
        }

        if (day === lastDay + 1) {
          dailyStreak++;
        } else {
          dailyStreak = 1;
        }

        if (dailyStreak > data.statistics.highestDailyStreak)
          data.statistics.highestDailyStreak = dailyStreak;
        lastDay = day;
      }
    }

    data.statistics.favoriteType = usedMsg > usedSlash ? "message" : "slash";
    data.statistics.favoriteCommand = Object.keys(data.statistics.commandUsage)
      .length
      ? Object.keys(data.statistics.commandUsage).reduce((a, b) =>
          data.statistics.commandUsage[a] > data.statistics.commandUsage[b]
            ? a
            : b
        )
      : null;

    const typePercent = data.statistics.usageCount
      ? Math.round(
          ((data.statistics.favoriteType === "message" ? usedMsg : usedSlash) /
            data.statistics.usageCount) *
            100
        )
      : null;

    data.statistics.favoriteTypePercent = typePercent || 0;

    // process actions
    const mutes = actions.filter((action) => action.actionType === "mute");
    const bans = actions.filter((action) => action.actionType === "ban");
    const kicks = actions.filter((action) => action.actionType === "kick");
    const unbans = actions.filter((action) => action.actionType === "unban");
    const unmutes = actions.filter((action) => action.actionType === "unmute");

    data.statistics.moderation.mutes = mutes.length;
    data.statistics.moderation.bans = bans.length;
    data.statistics.moderation.kicks = kicks.length;

    for (const mute of mutes) {
      if (mute.expiresAt && mute.timestamp)
        data.statistics.moderation.muteTime +=
          mute.expiresAt.getTime() - mute.timestamp.getTime();
    }

    const longestMute = mutes
      .filter((mute) => mute.forceExpired !== true)
      .sort(
        (a, b) => (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0)
      )
      .pop();
    const longestMuteTime =
      longestMute && longestMute.expiresAt && longestMute.timestamp
        ? longestMute.expiresAt?.getTime() - longestMute.timestamp?.getTime()
        : null;

    data.statistics.moderation.longestMute = longestMuteTime || 0;

    // process warns
    data.statistics.moderation.warns = warns.length;
    data.statistics.moderation.warnPercentile = getWarnPercentile(user.id);

    const unwarns = warns.filter((warn) => warn.unwarn);
    const heavies = warns.filter((warn) => warn.severity > 1);

    data.statistics.moderation.unwarns = unwarns.length;
    data.statistics.moderation.heavies = heavies.length;

    // other stats
    const all: ((typeof warns)[0] | (typeof actions)[0])[] = [
      ...warns,
      ...actions,
    ];
    const mods: Record<string, number> = {};
    for (const action of all) {
      mods[action.moderatorID] = (mods[action.moderatorID] || 0) + 1;
    }
    const enemy = mods.length
      ? Object.keys(mods).reduce((a, b) => (mods[a] > mods[b] ? a : b))
      : null;
    const enemyResolved = enemy
      ? await i.client.users.fetch(enemy).catch(() => null)
      : null;

    const enemyWarns = enemy
      ? warns.filter((warn) => warn.moderatorID === enemy)
      : [];
    const enemyActions = enemy
      ? actions.filter((action) => action.moderatorID === enemy)
      : [];

    if (enemyResolved && enemy)
      data.statistics.enemy = {
        id: enemy,
        username: enemyResolved.username,
        warns: enemyWarns.length,
        actions: enemyActions.length,
      };

    const badges = [];

    data.statistics.moderation.warnPercentile < 10 &&
      badges.push("Playin' it safe - Top 10% least warned");
    data.statistics.moderation.warnPercentile > 90 &&
      badges.push("Danger Zone - Top 10% most warned");
    unbans.length > 1 && badges.push("Second Chance - Unbanned multiple times");
    data.statistics.commandUsage["ai"] > 200 &&
      badges.push("AI Whisperer - Top 50 AI user");
    mutes.length > 10 && badges.push("Silent Treatment - Muted over 10 times");
    data.statistics.commandUsage["afk"] > 100 &&
      badges.push("AFK Master - Used AFK frequently");
    data.statistics.usageCount === 1 &&
      badges.push("One Hit Wonder - Only used Pomegranate once");
    data.statistics.moderation.warns === 0 &&
      data.statistics.moderation.mutes === 0 &&
      data.statistics.moderation.bans === 0 &&
      badges.push("Clean Slate - No moderation actions");

    const warnsFirstHalf = warns.filter(
      (warn) => warn.timestamp && warn.timestamp.getMonth() < 6
    );
    const warnsSecondHalf = warns.filter(
      (warn) => warn.timestamp && warn.timestamp.getMonth() >= 6
    );

    warnsSecondHalf.length < warnsFirstHalf.length / 1.5 &&
      badges.push(
        "Phoenix Rising - Improved moderation actions in the second half of the year"
      );

    type Season = "winter" | "spring" | "summer" | "fall";
    const commandsInSeason: Record<Season, number> = {
      winter: 0,
      spring: 0,
      summer: 0,
      fall: 0,
    };
    for (const analytic of analytics) {
      if (analytic.timestamp) {
        const month = analytic.timestamp.getMonth();
        if ([0, 1, 11].includes(month)) commandsInSeason["winter"]++;
        if ([2, 3, 4].includes(month)) commandsInSeason["spring"]++;
        if ([5, 6, 7].includes(month)) commandsInSeason["summer"]++;
        if ([8, 9, 10].includes(month)) commandsInSeason["fall"]++;
      }
    }
    const seasons = Object.keys(
      commandsInSeason
    ) as (keyof typeof commandsInSeason)[];
    const favoriteSeason = seasons.reduce((a, b) =>
      commandsInSeason[a] > commandsInSeason[b] ? a : b
    );
    const seasonBadge =
      favoriteSeason === "winter"
        ? "Winter Chill"
        : favoriteSeason === "spring"
        ? "Spring Bloom"
        : favoriteSeason === "summer"
        ? "Summer Heatwave"
        : "Fall Harvest";
    badges.push(`${seasonBadge} - Most active in ${favoriteSeason}`);

    data.statistics.badges = badges;

    const pages: EmbedBuilder[] = [];

    const startingPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setDescription(
        `Welcome to your chopped review, ${
          member?.nickname ?? user.username
        }! Here's how you kept (or tested) the peace in 2024.`
      )
      .setImage("https://i.ibb.co/4dcGVS5/chopped2024it2.png")
      .setColor(EmbedColors.info);

    pages.push(startingPage);

    const warnPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info);

    if (warns) {
      const percentile = data.statistics.moderation.warnPercentile;
      warnPage.setDescription(
        `Oops! You were warned \`${warns.length}\` time(s) in 2024. ${
          percentile > 50
            ? `Looks like that means you're in the top \`${percentile}\`% of users with the most warnings.`
            : `At least that's better than \`${100 - percentile}\`% of users!`
        }
        ${
          unwarns.length
            ? `On the bright side, you were unwarned \`${unwarns.length}\` time(s).`
            : ""
        }
        ${
          heavies.length
            ? `You also received \`${heavies.length}\` heavy warning(s).`
            : "Fortunately, you didn't receive any heavy warnings."
        }`
      );
    } else {
      warnPage.setDescription("You received no warnings in 2024. Keep it up!");
    }

    pages.push(warnPage);

    const mutePage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info);

    if (mutes.length) {
      const muteTime = (
        data.statistics.moderation.muteTime /
        1000 /
        60 /
        60
      ).toFixed(1);
      mutePage.setDescription(
        `You were muted \`${
          mutes.length
        }\` time(s) in 2024. Next time, just keep it to yourself. That adds up to \`${muteTime}\` hours of silence.${
          unmutes.length
            ? `\nGood thing you were unmuted \`${unmutes.length}\` time(s).`
            : ""
        }${
          longestMuteTime
            ? `\nYour longest mute lasted \`${ms(longestMuteTime, {
                long: true,
              })}\`. ${
                longestMuteTime > 1000 * 60 * 60 * 24
                  ? "Yikes! That's a long time."
                  : "Not too bad."
              }`
            : ""
        }`
      );
    } else {
      mutePage.setDescription("You were never muted in 2024. Keep it up!");
    }

    pages.push(mutePage);

    const redemptionPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info);

    if (unbans.length) {
      redemptionPage.setDescription(
        `You were unbanned \`${unbans.length}\` time(s) in 2024. Looks like you got a second chance. Keep it clean!`
      );
      pages.push(redemptionPage);
    }

    const enemyPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info);

    if (enemyResolved) {
      enemyPage.setDescription(
        `This year, someone in particular was out to get you. This moderator delivered the most actions against you, with a total of \`${enemyWarns.length}\` warns and \`${enemyActions.length}\` actions.
        <@${enemy}> (${enemyResolved.username}) was your biggest enemy in 2024.`
      );
      pages.push(enemyPage);
    }

    const typePage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info);

    typePage.setDescription(`Now let's see how you preferred to use Pomegranate in 2024.
      You preferred to use \`${data.statistics.favoriteType}\` commands${
      typePercent ? `, using them \`${typePercent}\`% of the time` : ""
    }. ${
      data.statistics.favoriteType === "message" ? "Old-fashioned!" : "Fancy!"
    }
      ${
        data.statistics.favoriteCommand
          ? `Your favorite command was \`${
              data.statistics.favoriteCommand
            }\`, which you used \`${
              data.statistics.commandUsage[data.statistics.favoriteCommand]
            }\` times. ${
              data.statistics.commandUsage[data.statistics.favoriteCommand] >
              100
                ? "Over a hundred! Talk about a power user."
                : ""
            }
      `
          : "It doesn't look like you had a favorite command."
      } Your longest daily streak was \`${
      data.statistics.highestDailyStreak
    }\` days.`);

    pages.push(typePage);

    const achievementPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info)
      .setDescription(
        `Congratulations! You've unlocked some badges in 2024.
        ${badges.map((badge) => `- ${badge}`).join("\n")}`
      );

    pages.push(achievementPage);

    const summaryPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setColor(EmbedColors.info);

    summaryPage.setDescription("Here's a summary of your 2024!").addFields([
      {
        name: "Usage Statistics",
        value: `- You used Pomegranate \`${
          data.statistics.usageCount
        }\` times\n- You preferred using \`${
          data.statistics.favoriteType
        }\` commands\n- Your longest daily streak was \`${
          data.statistics.highestDailyStreak
        }\` days\n- Your favorite command was \`${
          data.statistics.favoriteCommand
        }\`, which you used \`${
          data.statistics.favoriteCommand
            ? data.statistics.commandUsage[data.statistics.favoriteCommand]
            : 0
        }\` times`,
      },
      {
        name: "Moderation History",
        value: `- You were warned \`${
          data.statistics.moderation.warns
        }\` time(s), putting you in the top \`${
          data.statistics.moderation.warnPercentile
        }\`% of warned users\n- You were muted \`${
          data.statistics.moderation.mutes
        }\` time(s) for a total of \`${ms(data.statistics.moderation.muteTime, {
          long: true,
        })}\`\n- You were banned \`${
          data.statistics.moderation.bans
        }\` time(s)\n- You received \`${
          heavies.length
        }\` heavy warnings\n- You were unbanned \`${unbans.length}\` time(s)`,
      },
      {
        name: "Notable Mentions",
        value: `- ${
          enemy
            ? `Your biggest enemy was <@${enemy}> (${enemyResolved?.username})`
            : "You didn't have an enemy."
        }\n- You unlocked \`${badges.length}\` badge(s)`,
      },
    ]);

    pages.push(summaryPage);

    const endPage = new EmbedBuilder()
      .setTitle("Your Chopped | 2024")
      .setDescription(
        "Thanks for checking out your chopped review! Come back next year for more."
      )
      .setImage("https://i.ibb.co/gF9dDj4/chopped2024end1.png")
      .setColor(EmbedColors.info);

    pages.push(endPage);

    // Send pages
    const paginated = new PaginatedMessage();

    for (const page of pages) {
      paginated.addPageEmbed(page);
    }

    paginated.run(i, user);
  },
};
