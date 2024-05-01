import path from "path";
import { fileURLToPath } from "url";
import getFiles from "../helpers/getFiles.js";
import logger from "../helpers/logger.js";
import { Agenda } from "@hokify/agenda";
import type { Client } from "discord.js";
import Job from "../structures/jobInterface.js";

export default async (client: Client) => {
  const agenda = new Agenda({
    db: { address: process.env.MONGO_CONNECTION!, collection: "jobs" },
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const jobDir = path.join(__dirname, "../jobs");
  const jobs = await getFiles(jobDir, false, false);

  for (const job of jobs) {
    const jobFile: Job = (await import(`../jobs/${job}`))?.default;
    const jobName = path.basename(job).split(".")[0];
    if (!jobFile || !jobFile.every || !jobFile.execute) {
      logger.warn(`Job ${jobName} is not valid`);
      continue;
    }
    agenda.define(jobName, async () => {
      try {
        logger.info(`Executing job ${jobName}`);
        jobFile
          .execute(client)
          .then((response) =>
            logger.info(`Job ${jobName} executed with response: ${response}`),
          )
          .catch((e) =>
            logger.error(e, `Error while executing job ${jobName}`),
          );
      } catch (e) {
        logger.error(e, `Error while executing job ${jobName}`);
      }
    });
    if (!jobFile.dontRunOnStart) {
      try {
        logger.info(`Executing job ${jobName} on startup`);
        jobFile
          .execute(client)
          .then((response) =>
            logger.info(`Job ${jobName} executed with response: ${response}`),
          )
          .catch((e) =>
            logger.error(e, `Error while executing job ${jobName}`),
          );
      } catch (e) {
        logger.error(e, `Error while executing job ${jobName}`);
      }
    }
    try {
      agenda.every(jobFile.every, jobName);
    } catch (e) {
      logger.error(e, `Error while scheduling job ${jobName}`);
    }

    logger.info(`Job ${jobName} has been scheduled for every ${jobFile.every}`);
  }

  await agenda.start();
  return agenda;
};
