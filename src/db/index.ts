import mongoose from "mongoose";
import logger from "../helpers/logger.js";
import warn from "./models/warn.js";
import action from "./models/action.js";
import staff from "./models/staff.js";
import kv from "./models/kv.js";

// dev mode will always bypass prod mode
const connURL =
  (process.env.NODE_ENV && !process.env.DB_BYPASS_PROD) ||
  process.env.DB_BYPASS_DEV
    ? process.env.MONGO_CONNECTION_DEV
    : process.env.MONGO_CONNECTION;

mongoose
  .connect(connURL as string)
  .then(() => {
    logger.info("[DB] Connected to DB");
    if (process.env.NODE_ENV && process.env.DB_BYPASS_PROD)
      logger.warn(
        "[DB] CAUTION! You are connected to the PRODUCTION database in DEVELOPMENT mode. Be careful!"
      );
  })
  .catch((err) => {
    logger.error(`[DB] Error connecting to DB: ${err}`);
  });

export const Warn = warn;
export const Action = action;
export const Staff = staff;
export const KV = kv;
export default mongoose;
