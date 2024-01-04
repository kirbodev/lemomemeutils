import { Collection } from "discord.js";
import Config from "./structures/configInterface";

const config = new Collection<string, Config>();
// Test server
config.set("907340495498407977", new Config(
    "907340495498407977",
    "1172919578641317939",
    "1172920021371072534",
    "1180542522062278707",
    ",",
    "1187137588813893692",
    "1187137637841113179",
    "1036213847293444166"
));
// Lemomeme
config.set("538903170189885460", new Config(
    "538903170189885460",
    "724839115828232232",
    "724839112192032798",
    "765883363520544778",
    ",",
    "985333181538521128",
    "985333604013965343",
    "1096121613952491570"
));

export default config;
export let maintainanceMode = process.env.NODE_ENV ? true : false;
export const toggleMode = () => maintainanceMode = !maintainanceMode;
export const devs = ["980280857958965328", "695228246966534255"];
export const testServer = "907340495498407977";