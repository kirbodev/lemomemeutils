import pino from "pino";
import logCleanup from "./logCleanup.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Check if logs directory exists and create it if it doesn't
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const transport = pino.transport({
  targets: [
    {
      level: process.env.PINO_LOG_LEVEL ? process.env.PINO_LOG_LEVEL : "info",
      target: "pino/file",
      options: {
        // ISO string is an invalid file name so replace colons with dashes
        destination: `./logs/LOG-${new Date(Date.now())
          .toISOString()
          .replace(/:/g, "-")}.log`,
        mkdir: true,
      },
    },
    {
      level: process.env.PINO_LOG_LEVEL ? process.env.PINO_LOG_LEVEL : "info",
      target: "pino-pretty",
      options: {
        destination: 1,
      },
    },
    ...(process.env.NODE_ENV
      ? []
      : [
          {
            level: process.env.PINO_LOG_LEVEL
              ? process.env.PINO_LOG_LEVEL
              : "info",
            target: "@logtail/pino",
            options: {
              sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN,
            },
          },
        ]),
  ],
});

const logger = pino(
  {
    level: process.env.PINO_LOG_LEVEL ? process.env.PINO_LOG_LEVEL : "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

logger.info("Logger initialized");

logCleanup();

export default logger;
