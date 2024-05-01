import db from "../db/index.js";

interface DiscordStatusIncidentUpdate {
  body: string;
  created_at: Date;
  display_at: Date;
  id: string;
  incident_id: string;
  status:
    | "investigating"
    | "identified"
    | "monitoring"
    | "resolved"
    | "postmortem";
  updated_at: Date;
  affected_components: {
    code: string;
    name: string;
    old_status: string;
    new_status: string;
  }[];
}

interface DiscordStatusResponse {
  page: {
    id: "srhpyqt94yxb";
    name: "Discord";
    url: "https://discordstatus.com";
    updated_at: Date;
  };
  status: {
    description: string;
    indicator: "none" | "minor" | "major" | "critical";
  };
  components: {
    created_at: Date;
    description: string | null;
    id: string;
    name: string;
    page_id: string;
    position: number;
    status:
      | "operational"
      | "degraded_performance"
      | "partial_outage"
      | "major_outage";
    updated_at: Date;
  }[];
  incidents: {
    created_at: Date;
    id: string;
    impact: string;
    incident_updates: DiscordStatusIncidentUpdate[];
    monitoring_at: Date | null;
    name: string;
    page_id: string;
    resolved_at: Date | null;
    shortlink: string;
    status:
      | "investigating"
      | "identified"
      | "monitoring"
      | "resolved"
      | "postmortem";
    updated_at: Date;
  }[];
  scheduled_maintenances: {
    created_at: Date;
    id: string;
    impact: string;
    incident_updates: DiscordStatusIncidentUpdate[];
    monitoring_at: Date | null;
    name: string;
    page_id: string;
    resolved_at: Date | null;
    scheduled_for: Date;
    scheduled_until: Date;
    shortlink: string;
    status: string;
    updated_at: Date;
  }[];
}

interface ErrorStatus {
  status: 1 | 2 | 3 | 4 | 5;
  messages: string[];
  catastrophic?: boolean;
  updatedAt: Date;
}

export let statusCache = await getDiscordStatus();

setInterval(async () => {
  // revalidate the cache every minute
  const newStatus = await getDiscordStatus();
  if (newStatus) statusCache = newStatus;
}, 1000 * 60);

export async function getDiscordStatus(): Promise<DiscordStatusResponse | null> {
  const res = await fetch("https://discordstatus.com/api/v2/summary.json")
    .then(async (res) => (await res.json()) as DiscordStatusResponse)
    .catch(() => null);
  if (!res) return null;
  return res;
}

export let dbStatus: ErrorStatus | null = db.connection.readyState === 1 ? null : {
  status: 4,
  messages: ["Database connection lost. Most commands will not function."],
  updatedAt: new Date(),
};
db.connection.on("connected", () => {
  dbStatus = null;
});
db.connection.on("disconnected", () => {
  dbStatus = {
    status: 4,
    messages: ["Database connection lost. Most commands will not function."],
    updatedAt: new Date(),
  };
});

//STUB - More testing needed, seems to be too sensitive and impossible to exit the error state
// const prevErrorAmount: number[] = [];
// let errorAmount = 0;
// let clientErrorStatus: ErrorStatus | null = null;
// client.on("error", async () => {
//   errorAmount++;
// });
// process.on("uncaughtException", async () => {
//   errorAmount++;
// });
// process.on("unhandledRejection", async () => {
//   errorAmount++;
// });
// setInterval(() => {
//   if (!prevErrorAmount.length) return prevErrorAmount.push(errorAmount) && (errorAmount = 0);
//   const avg = Math.max(Math.min(prevErrorAmount.reduce((a, b) => a + b, 0) / prevErrorAmount.length, 15), 5);
//   if (errorAmount >= avg * 1.5) {
//     clientErrorStatus = {
//       status: 3,
//       messages: ["High error rate detected. Some commands may not function."],
//       updatedAt: new Date(),
//     };
//   }
// }, 1000 * 60 * 5).unref();

export default function getErrorStatus(): ErrorStatus | null {
  const errors: ErrorStatus[] = [];
  const status = statusCache;
  if (status?.status.indicator === "minor")
    errors.push({
      status: 2,
      messages: [`Minor Discord Issues - ${status.status.description}`],
      updatedAt: status.page.updated_at,
    });
  if (status?.status.indicator === "major")
    errors.push({
      status: 3,
      messages: [`Major Discord issues - ${status.status.description}`],
      updatedAt: status.page.updated_at,
    });
  if (status?.status.indicator === "critical")
    errors.push({
      status: 4,
      messages: [`Critical Discord issues - ${status.status.description}`],
      updatedAt: status.page.updated_at,
    });
  if (dbStatus) errors.push(dbStatus);
  // if (clientErrorStatus) errors.push(clientErrorStatus);

  if (errors.length > 0) {
    const catastrophic = errors.some((e) => e.status >= 4);
    const highestStatus = errors.reduce((prev, current) =>
      prev.status > current.status ? prev : current
    ).status;
    const lastUpdated = errors.reduce((prev, current) =>
      prev.updatedAt > current.updatedAt ? prev : current
    ).updatedAt;
    return {
      status: highestStatus,
      messages: errors.map((e) => e.messages).flat(),
      catastrophic,
      updatedAt: lastUpdated,
    };
  }

  return null;
}
