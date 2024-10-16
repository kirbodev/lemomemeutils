import mongoose from "mongoose";
import logger from "../helpers/logger.js";
import warn from "./models/warn.js";
import action from "./models/action.js";
import staff from "./models/staff.js";
import kv from "./models/kv.js";

const connURL = (process.env.DEV || process.env.DB_BYPASS_DEV) ? process.env.MONGO_CONNECTION_DEV : process.env.MONGO_CONNECTION;
mongoose.connect(connURL as string);

const db = mongoose.connection;

//db.connection.once("connected", () => logger.info("Connected to database"));
//db.connection.on("error", (e) => logger.error(e, "Error while connecting to database"));
//db.connection.on("disconnected", () => logger.warn("Disconnected from database"));
//db.connection.on("reconnected", () => logger.info("Reconnected to database"));
//db.connection.on("reconnectFailed", () => logger.error("Failed to reconnect to database"));

export const Warn = warn;
export const Action = action;
export const Staff = staff;
export const KV = kv;
export default mongoose;
