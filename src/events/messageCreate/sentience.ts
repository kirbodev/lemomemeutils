import { Attachment, Client, EmbedBuilder, Message, TextChannel } from "discord.js";
import {
  ChatSession,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import configs from "../../config.js";
import KV from "../../db/models/kv.js";
import kvInterface from "../../structures/kvInterface.js";
import { client } from "../../index.js";
import logger from "../../helpers/logger.js";
import {
  cooldowns,
  getCooldown,
} from "../../handlers/cooldownHandler.js";
import safeEmbed from "../../utils/safeEmbed.js";
import Errors from "../../structures/errors.js";
import ms from "ms";
import EmbedColors from "../../structures/embedColors.js";

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

const gen = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ai = gen.getGenerativeModel({
  model: "gemini-pro",
  generationConfig: {
    maxOutputTokens: 50,
  },
});
const imageAi = gen.getGenerativeModel({
  model: "gemini-pro-vision",
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

const chats = new Map<string, ChatSession>();

const aiChannels = configs
  .map((config) => config.aiChannels)
  .flat()
  .filter((channel) => channel) as string[];

let active = true;
const changeState = () => {
  const time = Math.floor(Math.random() * 300_000 + 300_000) * (active ? 1 : 4);
  setTimeout(async () => {
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
      if (
        lastMessage &&
        lastMessage.author.id === client.user!.id &&
        (activeMessages.includes(lastMessage.content) ||
          inactiveMessages.includes(lastMessage.content))
      )
        continue;

      await channel.send(message);
    }
    active = !active;
    chats.clear();
    changeState();
  }, time);
};
// changeState();

export default async (client: Client, message: Message) => {
  if (process.env.AI_KILL_SIGNAL) return;
  if (!active) return;
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!aiChannels.includes(message.channel.id)) return;
  if (!message.mentions.has(client.user!.id)) return;
  const config = configs.get(message.guild.id)!;
  if (!config.aiEnabled) return;
  if (!message.content) return;
  if (message.content.startsWith(config.prefix ?? ",")) return;
if (message.author.id === "695228246966534255" && message.content.endsWith("reset")) { chats.clear()
return message.reply("as you wish daddy") //LOL
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
  }

  if (attachments.length > 1)
    return message.reply("I can't handle multiple images, sorry!");

  const image = attachments.length
    ? await fetch(attachments[0].url)
        .then(async (res) => await res.arrayBuffer())
        .catch(() => null)
    : null;
  const base64 = image ? Buffer.from(image).toString("base64") : null;

  const text = await generateText(
    message.content,
    message.channel.id,
    message.author.username,
    base64 ? [base64, attachments[0].contentType as string] : null,
    refMessage
  );
  if (!text) return;
  let userCooldown = cooldowns.get(message.author.id);
  if (!userCooldown) {
    cooldowns.set(message.author.id, new Map());
    userCooldown = cooldowns.get(message.author.id)!;
  }
  userCooldown.set("ai", Date.now() + 2500);
  await message.channel.sendTyping();
  await new Promise((resolve) =>
    setTimeout(resolve, calculateTime(text.length))
  );

  const msg = await message.reply(text);
  const kv = new KV<kvInterface>({
    key: `botmsg-${msg.id}`,
    value: "ai",
  });
  await kv.save();
};

async function generateText(
  msg: string,
  channel: string,
  user: string,
  image?: [string, string] | null,
  responseTo?: Message | null
) {
  if (image) return await generateTextWithImage(msg, user, image, responseTo);
  let session = chats.get(channel);
  if (!session) {
    const chat = ai.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `Respond directly to the messages sent.`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: `"fw" means to like something, it stands for "fuck with". i am a chill moderation bot called pomegranate, im a woman, i pretend that im a human and talking to a discord public chat. I'm cool, a bit horny, and open to a lot of things, my responses are short, intriguing, humorous, I can insult people back and use a bit of brainrot terms, I don't capitalise text, I tend to use abbreviations, and I don't use punctuation or numbers instead of words, and i can never ping or say @everyone, @here or and everyone or here pings..`,
            },
          ],
        },
      ],
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
    chats.set(channel, chat);
    session = chat;
  }

  const result = await session
    .sendMessage([
      {
        text: `${user} says "${msg}"${
          responseTo
            ? ` in response to ${
                responseTo.author.id === responseTo.client.user.id
                  ? "your"
                  : `${responseTo.author.username}'s`
              } message "${responseTo.content}"`
            : ""
        }`,
      },
      ...(image
        ? [
            {
              inlineData: {
                mimeType: image[1],
                data: image[0],
              },
            },
          ]
        : []),
    ])
    .catch((e) => {
      logger.error(`Error while sending AI message ${e}`);
chats.clear()
      return null;
    });
  if (!result) return null;
  if (result.response.promptFeedback?.blockReason) return "blocked";
  const res = result.response.text();
  return res;
}

async function generateTextWithImage(
  msg: string,
  user: string,
  image: [string, string],
  responseTo?: Message | null
) {
  const intro = `"fw" means to like something btw, it stands for "fuck with". you are a chill moderation bot called pomegranate, youre a woman, you pretend that youre a human and talking to a discord public chat. youre cool, a bit horny, and open to a lot of things, youre very friendly and positive to everyone, your responses are usually short, intriguing, humorous, you can insult people back and use a bit of brainrot terms, you don't capitalise text, you tend to use abbreviations sometimes/very short sentences, and you don't use punctuation or numbers instead of words.`;
  // no multi-turn in this mode
  const result = await imageAi
    .generateContent([
      {
        text:
          intro +
          ` ${user} says "${msg}"${
            responseTo
              ? ` in response to ${
                  responseTo.author.id === responseTo.client.user.id
                    ? "your"
                    : `${responseTo.author.username}'s`
                } message "${responseTo.content}"`
              : ""
          }`,
      },
      ...(image
        ? [
            {
              inlineData: {
                mimeType: image[1],
                data: image[0],
              },
            },
          ]
        : []),
    ])
    .catch((e) => {
      logger.error(`Error while sending AI message ${e}`);
chats.clear()
      return null;
    });

  if (!result) return null;
  if (result.response.promptFeedback?.blockReason) return null;
  const res = result.response.text();
  return res;
}

function calculateTime(length: number) {
  // based on 350CPM or ~75wpm
  const time = Math.floor(length / 350) * 60 * 1000;
  return time;
}
