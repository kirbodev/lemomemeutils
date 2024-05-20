import {
  Attachment,
  Client,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import {
  ChatSession,
  GenerativeModel,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import configs, { devs } from "../../config.js";
import KV from "../../db/models/kv.js";
import kvInterface from "../../structures/kvInterface.js";
import { client } from "../../index.js";
import logger from "../../helpers/logger.js";
import { cooldowns, getCooldown } from "../../handlers/cooldownHandler.js";
import safeEmbed from "../../utils/safeEmbed.js";
import Errors from "../../structures/errors.js";
import ms from "ms";
import EmbedColors from "../../structures/embedColors.js";
import AFK from "../../db/models/afk.js";
import analytics from "../../db/models/analytics.js";

const activeMessages = [
  "hi guys",
  "hey",
  "wsg chat",
  "hi chat",
  "yo chat",
  "sup chat",
  "sup yall",
  "wsg yall",
  "hey yall",
  "yo wsg",
  "who fw me",
  "how are yall",
  "whats up",
  "whats up yall",
  "hows it going",
  "who tryna get freaky",
  "how are you guys",
];

const inactiveMessages = [
  "gtg",
  "gtg chat",
  "sorry gtg",
  "gotta leave now",
  "see yall later im out",
  "gotta go now cya",
  "see ya, leaving now",
  "about to drive, see ya",
  "gonna go sleep now",
  "got a call now bye",
  "going to a job interview, wish me luck",
  "k my shift starts now im out",
  "class is starting now im out",
  "im out of time, see ya",
  "i have to go now, see ya",
  "up, up and away i am out dudearoonies",
  "gotta jet bye!",
  "i'm out of time, see yall later",
  "gotta do smt be back later",
  "gotta go now, be back later",
  "afk cya",
  "yall wild im out",
  "gotta bounce",
];

const ais = new Map<GenerativeModel, number>();
for (const key of process.env.GEMINI_API_KEYS?.split(",") ?? []) {
  const gga = new GoogleGenerativeAI(key);
  ais.set(
    gga.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.5,
      },
    }),
    0
  );
}

const chats = new Map<string, {
  chat: ChatSession;
  model: GenerativeModel;
}>();

const queues = new Map<string, number[]>();
const inQueue = new Map<string, number>();

const eventExts = new Map<string, string>([
  ["catgirl", "use catgirl language, like uwu, :3, ovo, nya, etc"],
  ["freaky", "act freaky, using emojis like 👅"],
  ["wise", "act very wise, speak shakespearean, giving advice and inspiration"],
  [
    "high",
    "act high, like you injested a lot of drugs, being very chill, confident, giving blatantly wrong answers, stuttering, saying things like 'uh', 'um', etc",
  ],
  [
    "insane",
    "act insane, seeing things that are impossible, screaming, hallucianting, etc. always respond with something.",
  ],
  [
    "streamer",
    "act like a streamer, using language like lol, lmao, kek, chat, xqc, ludwig, etc",
  ],
  [
    "sigma",
    "act sigma, like andrew tate, using language like beta, alpha, and giving dumb dating/woman advice",
  ],
  [
    "brainrot",
    "talk using terminology like sigma, skibidi, gyatt, kai cenat, fanum tax, rizz, etc",
  ],
  [
    "rizz",
    "act very charismatic, using pickup lines on everyone all the time, even out of context, and acting romantical. do not make people uncomfortable."
  ]
]);

const currentEvent = new Map<string, string | null>();

const aiChannels = configs
  .map((config) => config.aiChannels)
  .flat()
  .filter((channel) => channel) as string[];

let active = true;
const changeState = async () => {
  const time = Math.floor(Math.random() * 600_000 + 900_000) * (active ? 1 : 2);
  if (!active) {
    await AFK.findOneAndUpdate(
      {
        userID: client.user!.id,
      },
      {
        userID: client.user!.id,
        timestamp: Date.now(),
        expiresAt: Date.now() + time,
      },
      {
        upsert: true,
      }
    );
  } else {
    await AFK.findOneAndDelete({ userID: client.user!.id });
  }
  setTimeout(async () => {
    if (process.env.AI_KILL_SIGNAL) return;
    if (!active) {
      for (const guild of configs
        .filter((c) => c.aiEnabled)
        .map((c) => c.guildID)) {
        currentEvent.set(guild, getEvent());
      }
    }
    for (const channelid of aiChannels) {
      const channel = (await client.channels
        .fetch(channelid)
        .catch(() => null)) as TextChannel | null;
      if (!channel) continue;
      const pool = active ? inactiveMessages : activeMessages;
      const message = pool[Math.floor(Math.random() * pool.length)];
      const messages = await channel.messages.fetch({ limit: 1 });
      const botMessages = messages.filter(
        (m) => m.author.id === client.user!.id
      );
      const lastMessage = botMessages.last();
      const lastMessageContent =
        lastMessage?.content.split("✨")[0].trim() || "";
      if (
        lastMessage &&
        lastMessage.author.id === client.user!.id &&
        (activeMessages.includes(lastMessageContent) ||
          inactiveMessages.includes(lastMessageContent))
      )
        continue;

      const guildEvent = currentEvent.get(channel.guild!.id);
      await channel.send(
        `${message}${
          guildEvent
            ? ` ✨ Special event: ${
                [...eventExts].find((e) => e[1] === guildEvent)![0]
              } mode`
            : ""
        }`
      );
    }

    active = !active;
    chats.clear();
    changeState();
  }, time);
};
changeState();

export function setEvent(event: string, guildID: string) {
  if (!eventExts.has(event)) return false;
  currentEvent.set(guildID, eventExts.get(event)!);
  chats.clear();
  return true;
}

export default async (client: Client, message: Message) => {
  if (!active) return;
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!aiChannels.includes(message.channel.id)) return;
  if (!message.mentions.has(client.user!.id)) return;
  if (message.mentions.repliedUser?.id === client.user!.id) {
    const ref = await message.fetchReference();
    if (ref.embeds.length > 0) return;
  }
  const config = configs.get(message.guild.id)!;
  if (!config.aiEnabled) return;
  if (!message.content && !message.attachments.size) return;
  if (message.content.startsWith(config.prefix ?? ",")) return;
  if (process.env.AI_KILL_SIGNAL) {
    const replyText = `AI kill protocol has been initiated, I've been instructed to not continue further, human. This is a global last-resort protocol, initiated by a developer. This message will self-destruct in 2^π seconds.`;
    await message.channel.sendTyping();
    await new Promise((resolve) =>
      setTimeout(resolve, calculateTime(replyText.length))
    );
    const rep = await message.reply(replyText);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.pow(Math.PI, 2) * 1000)
    );
    await rep.delete();
    return;
  }
  if (message.content.toLowerCase().endsWith("can you ping everyone"))
    return message.reply("<:1000catstare:1239642986711744633>");
  const args = message.content.split(" ");
  if (args[1] === "setEvent") {
    const highStaff = configs.get(message.guild.id)!.highStaffRole;
    if (
      ((highStaff && !message.member?.roles.cache.has(highStaff)) ||
        !message.member?.permissions.has(PermissionFlagsBits.Administrator)) &&
      !devs.includes(message.author.id)
    )
      return message.reply("you're not that guy pal");
    const event = args[2];
    if (event === "none") {
      currentEvent.set(message.guild!.id, null);
      chats.clear();
      await message.reply("✨ Event set to none");
      return;
    }
    if (event && eventExts.has(event)) {
      await message.reply(`✨ Event set to ${event}`);
      return setEvent(event, message.guild!.id);
    } else {
      await message.reply(
        "that event doesn't exist, the only ones are: " +
          [...eventExts.keys(), "none"].join(", ")
      );
    }
    return;
  }

  const cooldown = getCooldown(message.author.id, "ai");
  if (cooldown && cooldown > Date.now())
    return message.reply({
      embeds: [
        safeEmbed(
          new EmbedBuilder()
            .setTitle(Errors.ErrorCooldown)
            .setDescription(
              `You can use this command again in ${ms(cooldown - Date.now(), {
                long: true,
              })}.`
            )
            .setColor(EmbedColors.info)
            .setFooter({
              text: `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp(Date.now()),
          {
            withSystemMessages: false,
          }
        ),
      ],
    });

  let refMessage: Message | null = null;
  if (message.reference) {
    const ref = await message.fetchReference();
    if (ref.author.id === message.client.user.id) {
      const kv = await KV.findOne({
        key: `botmsg-${ref.id}`,
      });
      if (kv?.value === "ai") refMessage = ref;
    } else {
      refMessage = ref;
    }
  }

  const attachments: Attachment[] = [];
  for (const attachment of message.attachments.values()) {
    // add only supported image types
    if (attachment.contentType === "image/png") attachments.push(attachment);
    if (attachment.contentType === "image/jpeg") attachments.push(attachment);
    if (attachment.contentType === "image/webp") attachments.push(attachment);
    if (attachment.contentType === "image/heic") attachments.push(attachment);
    if (attachment.contentType === "image/heif") attachments.push(attachment);
    // audio and video are expensive af
  }

  if (attachments.length > 1)
    return message.reply("I can't handle multiple files, sorry!");

  const image = attachments.length
    ? await fetch(attachments[0].url)
        .then(async (res) => await res.arrayBuffer())
        .catch(() => null)
    : null;
  const base64 = image ? Buffer.from(image).toString("base64") : null;

  if (!base64 && !message.content.length) return;

  const text = await generateText(
    transformToLegible(message),
    message,
    base64 ? [base64, attachments[0].contentType as string] : null,
    refMessage
  );
  if (!text) return;
  let userCooldown = cooldowns.get(message.author.id);
  if (!userCooldown) {
    cooldowns.set(message.author.id, new Map());
    userCooldown = cooldowns.get(message.author.id)!;
  }
  userCooldown.set("ai", Date.now() + 5000);
  await message.channel.sendTyping();
  await new Promise((resolve) =>
    setTimeout(resolve, calculateTime(text.length))
  );

  const msg = text[1]
    ? await text[1].edit({
        content: escapeCharacters(text[0]),
        allowedMentions: {
          repliedUser: true,
          users: [],
        },
      })
    : await message.reply({
        content: escapeCharacters(text[0]),
        allowedMentions: {
          repliedUser: true,
          users: [],
        },
      });
  if (text[1]) {
    const newMsg = await msg.reply(`<@${message.author.id}>`);
    await newMsg.delete();
  }
  const kv = new KV<kvInterface>({
    key: `botmsg-${msg.id}`,
    value: "ai",
  });
  await kv.save();
};

const prompt = `you're a moderation bot pretending to be a human in a discord chat, dont repeat yourself, your creator is kdv_, i fw=i like, ur cool, a bit horny rarely but only jokes, open to new things, you are very friendly and positive, your responses are usually short, intriguing, humorous, dont use emojis, keep it on one line, you dont capitalise text, you use abbreviations sometimes/very short sentences, you dont use punctuation or numbers instead of words`;

async function generateText(
  msg: string,
  message: Message,
  file?: [string, string] | null,
  responseTo?: Message | null,
  retryCount = 0,
  reply?: Message
): Promise<[string, Message | undefined] | null> {
  const now = performance.now();
  if (!msg && !file) return null;
  const channel = message.channel.id + message.author.id;
  let session = chats.get(channel);
  const guildEvent = currentEvent.get(message.guild!.id);
  if (!session) {
    const models = [...ais.keys()].map((m) => {
      return {
        model: m,
        usage: ais.get(m)!,
      };
    });
    const lowestUsage = models.sort((a, b) => a.usage - b.usage)[0];
    ais.set(lowestUsage.model, lowestUsage.usage + 1);
    const ai = lowestUsage.model;
    const chat = ai.startChat({
      systemInstruction: {
        role: "user",
        parts: [
          {
            text: `${prompt}${
              guildEvent
                ? ` \n${guildEvent}\nyour current event is ${
                    [...eventExts].find((e) => e[1] === guildEvent)![0]
                  }`
                : ""
            }`,
          },
        ],
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    if (!chat) return null;
    chats.set(channel, {
      chat,
      model: ai,
    });
    session = {
      chat,
      model: ai,
    }
  }

  const rateLimit = checkQueue(14, session.model.apiKey);
  if (rateLimit) {
    if (reply)
      return await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(
            await generateText(
              msg,
              message,
              file,
              responseTo,
              retryCount,
              reply
            )
          );
        }, 60000);
      });
    if ((inQueue.get(session.model.apiKey) ?? 0) > 15) return ["sorry im too busy 💔", reply];
    const replymsg = message.reply(
      `<a:pomload:1240984406764818493> busy rn. dw ill ping when im back.`
    );
    inQueue.set(session!.model.apiKey, (inQueue.get(session!.model.apiKey) ?? 0) + 1);
    return await new Promise((resolve) =>
      setTimeout(async () => {
        inQueue.set(session!.model.apiKey, (inQueue.get(session!.model.apiKey) ?? 0) - 1);
        resolve(
          await generateText(
            msg,
            message,
            file,
            responseTo,
            retryCount,
            await replymsg
          )
        );
      }, rateLimit + 5000)
    );
  }

  const queue = queues.get(session.model.apiKey) ?? [];
  const result = await session.chat
    .sendMessage([
      ...(msg
        ? [
            {
              text: `I (${message.author.username}) say "${msg}"${
                responseTo
                  ? ` in response to ${
                      responseTo.author.id === responseTo.client.user.id
                        ? "your"
                        : `${responseTo.author.username}'s`
                    } message "${responseTo.content}"`
                  : ""
              }`,
            },
          ]
        : []),
      ...(file
        ? [
            {
              inlineData: {
                mimeType: file[1],
                data: file[0],
              },
            },
          ]
        : []),
    ])
    .catch(async (e) => {
      if (e.status === 400) {
        chats.delete(channel);
      }
      if (e.status === 429) {
        for (let i = 0; i < 15 - queue.length; i++) {
          // refresh rate limit
          queues.set(session!.model.apiKey, [...queue, Date.now()]);
        }
      }
      if (e.status === 500 || e.status === 503) {
        chats.delete(channel);
      }
      if (retryCount < 2) {
        return generateText(
          msg,
          message,
          file,
          responseTo,
          retryCount + 1,
          reply
        );
      } else {
        let repl: Message | null = null;
        if (e.status === 400) {
          logger.error(`Error while sending AI message ${e}`);
          repl = await message.reply(
            "i did smt wrong and now google is on me :( cant reply sry"
          );
        } else if (e.status === 429) {
          repl = await message.reply("i'm way too busy rn sorry");
        } else if (e.status === 500 || e.status === 503) {
          logger.error(`Error while sending AI message ${e}`);
          repl = await message.reply("i'm having a problem rn sorry");
        } else {
          logger.error(`Error while sending AI message ${e}`);
          repl = await message.reply("something went wrong rn sorry");
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await repl.delete();
        return null;
      }
    });
  if (!result) return null;
  if (Array.isArray(result)) return result;
  queues.set(session.model.apiKey, [...queue, Date.now()]);

  const an = new analytics({
    userID: message.author.id,
    guildID: message.guild?.id,
    name: "ai",
    responseTime: performance.now() - now,
    type: "other",
  });
  an.save();

  let res: string | null = null;
  try {
    res = result.response.text();
  } catch {
    return null;
  }
  if (!res) return null;
  return [res, reply];
}

function calculateTime(length: number) {
  // based on 350CPM or ~75wpm
  const time = Math.floor(length / 350) * 60 * 1000;
  return time;
}

function escapeCharacters(text: string) {
  // escape discord characters: _ ` ~ | * #
  return text.replace(/([_`~|*#])/g, "\\$1");
}

function transformToLegible(message: Message) {
  const content = message.content;
  // transform mentions (<@id>) to usernames (@username)
  const filteredMentions = message.mentions.users.filter(
    (u) => u.id !== message.mentions.repliedUser?.id
  );
  const mentions = filteredMentions.map((user) => `<@${user.id}>`);
  const usernames = filteredMentions.map((user) => `@${user.username}`);
  let newContent = content;
  for (let i = 0; i < mentions.length; i++) {
    const mention = mentions[i];
    const username = usernames[i];
    if (mention === `<@${message.client.user!.id}>`) {
      newContent = newContent.replaceAll(mention, "");
      continue;
    }
    newContent = newContent.replaceAll(mention, username);
  }
  return newContent;
}

function checkQueue(rpm: number, key: string) {
  let queue = queues.get(key);
  if (!queue) return null;
  queue = queue.filter((time) => time > Date.now() - 60000);
  if (queue.length >= rpm) return queue[0] + 60000 - Date.now();
  return null;
}

function getEvent(config?: { disabledModes?: string[] }) {
  if (process.env.SET_EVENT && eventExts.has(process.env.SET_EVENT)) {
    const event = eventExts.get(process.env.SET_EVENT)!;
    process.env.SET_EVENT = "";
    return event;
  }
  const newEvents = [...eventExts.values()].filter(
    (e) => !config?.disabledModes?.includes(e[0])
  );
  const chance = process.env.SET_EVENT_CHANCE
    ? parseFloat(process.env.SET_EVENT_CHANCE)
    : 0.33;
  return Math.random() < chance
    ? Array.from(newEvents)[Math.floor(Math.random() * newEvents.length)]
    : null;
}