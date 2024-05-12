import mongoose from "mongoose";
import logger from "../helpers/logger.js";
import warn from "./models/warn.js";
import action from "./models/action.js";
import staff from "./models/staff.js";
import kv from "./models/kv.js";

mongoose.connect(process.env.MONGO_CONNECTION_DEV || process.env.MONGO_CONNECTION as string);

const db = mongoose.connection;

db.once("connected", () => logger.info("Connected to database"));
db.on("error", (e) => logger.error(e, "Error while connecting to database"));
db.on("disconnected", () => logger.warn("Disconnected from database"));
db.on("reconnected", () => logger.info("Reconnected to database"));
db.on("reconnectFailed", () => logger.error("Failed to reconnect to database"));

export const Warn = warn;
export const Action = action;
export const Staff = staff;
export const KV = kv;
export default mongoose;
