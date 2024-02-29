import mongoose from "mongoose";
import logger from "../helpers/logger";
import warn from "./models/warn";
import action from "./models/action";
import staff from "./models/staff";
import kv from "./models/kv";

mongoose.connect(process.env.MONGO_CONNECTION as string);

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
