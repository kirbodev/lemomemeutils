import { ActivitiesOptions, ActivityType, Client } from "discord.js";
import getErrorStatus from "../../handlers/errorHandler.js";
import { client } from "../../index.js";
import logger from "../../helpers/logger.js";

const statuses: ActivitiesOptions[] = [
  {
    type: ActivityType.Custom,
    name: "✨ Nothing gold can stay",
  },
  {
    type: ActivityType.Custom,
    name: "⭐ Stars can't shine without darkness",
  },
  {
    type: ActivityType.Custom,
    name: "👅 Let's get freaky",
  },
  {
    type: ActivityType.Custom,
    name: "⌛ Life is short, time is fast",
  },
  {
    type: ActivityType.Custom,
    name: "📖 You're the author of your own story. Write a good one.",
  },
  {
    type: ActivityType.Custom,
    name: "👅 I'm a freak fr just lmk",
  },
  {
    type: ActivityType.Custom,
    name: "⌚ Spend your life taking no risk, and you'll die having never lived.",
  },
  {
    type: ActivityType.Custom,
    name: "🧠 Suicide is not the end, it's the start of a feedback loop.",
  },
  {
    type: ActivityType.Watching,
    name: "my status page at https://status.kdv.one/",
  },
];

let override: ActivitiesOptions | null = null;
let prevLevel: number | null = null;
let prevStatus: ActivitiesOptions | null = null;

setInterval(() => {
  const status = getErrorStatus();
  if (!status) {
    override = null;
    client.user?.setStatus("online");
    return;
  }
  if (status.status === prevLevel) return;
  override = {
    type: ActivityType.Competing,
    name: `having problems (Level ${status.status}) - https://status.kdv.one/`,
  };
  logger.warn(`Status level changed to ${status.status}`);
  prevLevel = status.status;
  client.user?.setStatus("dnd");
  client.user?.setActivity(override);
}, 1000 * 15);

export default () => {
  setStatus(client);
  setInterval(() => setStatus(client), 1000 * 60 * 5);
};

function setStatus(client: Client) {
  if (override) return client.user?.setActivity(override);
  client.user?.setStatus("online");
  const newStatusList = statuses.filter((s) => s !== prevStatus);
  const newStatus =
    newStatusList[Math.floor(Math.random() * newStatusList.length)];
  prevStatus = newStatus;
  client.user?.setActivity(newStatus);
}
