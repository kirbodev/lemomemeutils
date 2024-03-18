import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  GuildMember,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  StringSelectMenuInteraction,
  AttachmentBuilder,
  Message,
} from "discord.js";
import type Command from "../../structures/commandInterface";
import EmbedColors from "../../structures/embedColors";
import safeEmbed from "../../utils/safeEmbed";
import { Action, Warn } from "../../db";
import { HydratedDocument } from "mongoose";
import warnInterface from "../../structures/warnInterface";
import actionInterface from "../../structures/actionInterface";
import Errors from "../../structures/errors";
import { nanoid } from "nanoid";
import userAnalytics from "../../db/models/userAnalytics";
import userAnalyticsInterface from "../../structures/userAnalyticsInterface";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { loadImage } from "canvas";

export default {
  name: "modstats",
  description: "Get statistics about a mod.",
  cooldown: 10000,
  options: [
    {
      name: "mod",
      description: "The mod to get statistics for.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  permissionsRequired: [PermissionsBitField.Flags.ManageMessages],
  async slash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const moduser = interaction.options.getUser("mod");
    const mod = moduser
      ? await interaction.guild!.members.fetch(moduser.id).catch(() => null)
      : (interaction.member as GuildMember);
    if (!mod)
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
          ),
        ],
      });
    if (
      !(mod.permissions as PermissionsBitField)?.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return interaction.editReply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("That user is not a moderator.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
          ),
        ],
      });
    }

    const id = nanoid();
    const select =
      new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([
        new StringSelectMenuBuilder()
          .setCustomId(id)
          .setPlaceholder("Select a time period")
          .addOptions([
            {
              label: "1 day",
              value: "1",
            },
            {
              label: "7 days",
              value: "7",
            },
            {
              label: "14 days",
              value: "14",
            },
            {
              label: "30 days",
              value: "30",
            },
            {
              label: "All time",
              value: "all",
            },
          ]),
      ]);
    interaction.editReply(await sendStats(interaction, mod, 7, select));

    interaction
      .channel!.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.customId === id && i.user.id === interaction.user.id,
        time: 1000 * 60 * 5,
      })
      .on("collect", async (i) => {
        await i.deferUpdate();
        const timePeriod = parseInt(i.values[0]);
        interaction.editReply(await sendStats(i, mod, timePeriod, select));
      })
      .on("end", () => {
        interaction.editReply({ components: [] });
      });
  },
  async message(interaction, { args }) {
    args = args ?? [];
    const rawUser = args[0];
    const moduser = rawUser
      ? await interaction.client.users
          .fetch(rawUser.replace(/[<@!>]/g, ""))
          .catch(() => null)
      : null;
    const mod = moduser
      ? await interaction.guild!.members.fetch(moduser.id).catch(() => null)
      : (interaction.member as GuildMember);
    if (!mod)
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorMemberNotFound)
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
          ),
        ],
      });
    if (
      !(mod.permissions as PermissionsBitField)?.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return interaction.reply({
        embeds: [
          safeEmbed(
            new EmbedBuilder()
              .setTitle(Errors.ErrorUser)
              .setDescription("That user is not a moderator.")
              .setColor(EmbedColors.error)
              .setFooter({
                text: `Requested by ${interaction.author.tag}`,
                iconURL: interaction.author.displayAvatarURL(),
              })
          ),
        ],
      });
    }

    const id = nanoid();
    const select =
      new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([
        new StringSelectMenuBuilder()
          .setCustomId(id)
          .setPlaceholder("Select a time period")
          .addOptions([
            {
              label: "1 day",
              value: "1",
            },
            {
              label: "7 days",
              value: "7",
            },
            {
              label: "14 days",
              value: "14",
            },
            {
              label: "30 days",
              value: "30",
            },
            {
              label: "All time",
              value: "all",
            },
          ]),
      ]);
    const msg = await interaction.reply(
      await sendStats(interaction, mod, 7, select)
    );

    interaction
      .channel!.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.customId === id && i.user.id === interaction.author.id,
        time: 1000 * 60 * 5,
      })
      .on("collect", async (i) => {
        await i.deferUpdate();
        const timePeriod = parseInt(i.values[0]);
        msg.edit(await sendStats(i, mod, timePeriod, select));
      })
      .on("end", () => {
        msg.edit({ components: [] });
      });
  },
} as Command;

async function getStats(member: GuildMember, timePeriod: number | null) {
  const warns: HydratedDocument<warnInterface>[] = await Warn.find({
    moderatorID: member.id,
    guildID: member.guild.id,
    unwarn: { $exists: false },
    timestamp: timePeriod
      ? { $gt: Date.now() - timePeriod }
      : { $exists: true },
  });
  const bans: HydratedDocument<actionInterface>[] = await Action.find({
    moderatorID: member.id,
    guildID: member.guild.id,
    actionType: "ban",
    timestamp: timePeriod
      ? { $gt: Date.now() - timePeriod }
      : { $exists: true },
  });
  const kicks: HydratedDocument<actionInterface>[] = await Action.find({
    moderatorID: member.id,
    guildID: member.guild.id,
    actionType: "kick",
    timestamp: timePeriod
      ? { $gt: Date.now() - timePeriod }
      : { $exists: true },
  });
  const mutes: HydratedDocument<actionInterface>[] = await Action.find({
    moderatorID: member.id,
    guildID: member.guild.id,
    actionType: "mute",
    timestamp: timePeriod
      ? { $gt: Date.now() - timePeriod }
      : { $exists: true },
  });
  const activity: HydratedDocument<userAnalyticsInterface> | null =
    await userAnalytics.findOne({
      userID: member.id,
      guildID: member.guild.id,
      messages: {
        $elemMatch: {
          hour: timePeriod
            ? { $gt: Date.now() - timePeriod }
            : { $exists: true },
        },
      },
    });
  const messageCount = activity?.messages.reduce(
    (acc, curr) => acc + curr.amount,
    0
  );
  return { warns, bans, kicks, mutes, messageCount };
}

async function sendStats(
  interaction:
    | StringSelectMenuInteraction
    | ChatInputCommandInteraction
    | Message,
  mod: GuildMember,
  timePeriod: number,
  select: ActionRowBuilder<StringSelectMenuBuilder>
) {
  const { warns, bans, kicks, mutes, messageCount } = await getStats(
    mod,
    isNaN(timePeriod) ? null : 1000 * 60 * 60 * 24 * timePeriod
  );

  const attachment = new AttachmentBuilder(
    await drawChart(
      warns,
      bans,
      kicks,
      mutes,
      isNaN(timePeriod)
        ? null
        : new Date(Date.now() - 1000 * 60 * 60 * 24 * timePeriod)
    ),
    {
      name: `chart-${mod.id}-${Date.now()}.png`,
    }
  );

  const embed = safeEmbed(
    new EmbedBuilder()
      .setTitle(`Mod Stats | ${mod.user.tag}`)
      .setDescription(
        `Please be aware that message count only counts from v1.7 or when the bot was added to the server. Warns do not include unwarns.\nShowing stats for ${
          isNaN(timePeriod) ? "all time" : `the past ${timePeriod} days`
        }.`
      )
      .setColor(EmbedColors.info)
      .setFields([
        {
          name: "Warns",
          value: warns.length.toString(),
          inline: true,
        },
        {
          name: "Kicks",
          value: kicks.length.toString(),
          inline: true,
        },
        {
          name: "Bans",
          value: bans.length.toString(),
          inline: true,
        },
        {
          name: "Mutes",
          value: mutes.length.toString(),
          inline: true,
        },
        {
          name: "Messages",
          value: messageCount?.toString() || "No data",
          inline: true,
        },
      ])
      .setImage(`attachment://${attachment.name}`)
      .setThumbnail(mod.user.displayAvatarURL())
      .setFooter({
        text: `Requested by ${
          (interaction instanceof Message
            ? interaction.author
            : interaction.user
          ).tag
        }`,
        iconURL: (interaction instanceof Message
          ? interaction.author
          : interaction.user
        ).displayAvatarURL(),
      })
      .setTimestamp()
  );

  return { embeds: [embed], files: [attachment], components: [select] };
}

async function drawChart(
  warns: HydratedDocument<warnInterface>[],
  bans: HydratedDocument<actionInterface>[],
  kicks: HydratedDocument<actionInterface>[],
  mutes: HydratedDocument<actionInterface>[],
  startDate: Date | null
) {
  const width = 800;
  const height = 400;
  const img = await loadImage("./src/assets/pomegranate-corporate.png");
  const chart = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "#02040a",
    chartCallback: (chartjs) => {
      chartjs.defaults.color = "#D0DBFD";
      chartjs.defaults.borderColor = "rgba(255, 255, 255, 0.2)";
      chartjs.defaults.font.family = "Inter, sans-serif";
    },
    plugins: {
      modern: [
        "chartjs-adapter-moment",
        {
          id: "watermark",
          afterDraw: async (chart) => {
            const { ctx } = chart;
            ctx.drawImage(
              img as unknown as CanvasImageSource,
              width - 50,
              0,
              50,
              50
            );
          },
        },
      ],
    },
  });
  chart.registerFont("./src/fonts/Inter-Regular.ttf", {
    family: "Inter",
  });

  const now = new Date();
  const dates = [];
  if (!startDate) {
    startDate = new Date(
      Math.min(
        ...[warns, bans, kicks, mutes]
          .map((a) => a.map((b) => b.timestamp!.getTime()))
          .flat()
      )
    );
  }
  startDate.setHours(0, 0, 0, 0);

  while (startDate < now) {
    dates.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 1);
  }
  // find warns that correspond the correct day
  const warnData = dates.map(
    (date) =>
      warns.filter(
        (w) =>
          w.timestamp!.getTime() >= date.getTime() &&
          w.timestamp!.getTime() <= date.getTime() + 1000 * 60 * 60 * 24
      ).length
  );
  const banData = dates.map(
    (date) =>
      bans.filter(
        (w) =>
          w.timestamp!.getTime() >= date.getTime() &&
          w.timestamp!.getTime() <= date.getTime() + 1000 * 60 * 60 * 24
      ).length
  );
  const kickData = dates.map(
    (date) =>
      kicks.filter(
        (w) =>
          w.timestamp!.getTime() >= date.getTime() &&
          w.timestamp!.getTime() <= date.getTime() + 1000 * 60 * 60 * 24
      ).length
  );
  const muteData = dates.map(
    (date) =>
      mutes.filter(
        (w) =>
          w.timestamp!.getTime() >= date.getTime() &&
          w.timestamp!.getTime() <= date.getTime() + 1000 * 60 * 60 * 24
      ).length
  );

  const data = await chart.renderToBuffer({
    type: "bar",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Warns",
          data: warnData,
          backgroundColor: "#2B7734",
          borderRadius: 4,
        },
        {
          label: "Kicks",
          data: kickData,
          backgroundColor: "#F76A20",
          borderRadius: 4,
        },
        {
          label: "Bans",
          data: banData,
          backgroundColor: "#AA0610",
          borderRadius: 4,
        },
        {
          label: "Mutes",
          data: muteData,
          backgroundColor: "#7399FA",
          borderRadius: 4,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
  return data;
}

// perhaps import data from statbot in the future
// async function getStats(member: GuildMember) {
//   // Didn't secure your api very well, did you statbot?
//   const res = await fetch(
//     `https://proxy.statbot.net/servers/538903170189885460/message`,
//     {
//       headers: {
//         Token: process.env.STATBOT_KEY!,
//       },
//       body: JSON.stringify({
//         query: {
//           type: "query",
//           start: 1707868800000,
//           interval: "hour",
//           timezone_offset: 0,
//           whitelist_members: ["695228246966534255"],
//           bot: false,
//           voice_states: [
//             "normal",
//             "afk",
//             "self_deaf",
//             "self_mute",
//             "server_deaf",
//             "server_mute",
//           ],
//         },
//         source: "89uref389ur89fgh34ur",
//       }),
//       method: "POST",
//     }
//   );
//   console.log(res);
//   if (!res || !res.ok) return null;
//   // res is a ReadableStream, wait until it's done and parse the JSON
//   const stream = res.body?.getReader();
//   if (!stream) return null;
//   let data = "";
//   // eslint-disable-next-line no-constant-condition
//   while (true) {
//     const { done, value } = await stream.read();
//     if (done) break;
//     data += new TextDecoder().decode(value);
//   }
//   // get objects from the string, it will start with data: and there might be more objects after it
//   if (!data.includes('"type":"data"')) return getStats(member);
//   data = `{"type":"data"${data.split('"type":"data"')[1]}`;
//   data = data.split("}")[0] + "}}";
//   writeFileSync("data.json", data);
//   data = JSON.parse(data);
//   return data;
// }
