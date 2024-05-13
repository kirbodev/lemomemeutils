import { Collection } from "discord.js";
import Config from "./structures/configInterface.js";
import { StaffLevel } from "./structures/staffInterface.js";

/*
    guildID: string;
    firstWarnRoleID: string;
    secondWarnRoleID: string;
    paroleRoleID: string;
    prefix?: string;
    thinIceRoleID?: string;
    thinnerIceRoleID?: string;
    logChannelID?: string;
    logChannel?: GuildTextBasedChannel;
    staffApplicationsChannelID?: string;
    staffVoteChannelID?: string;
    staffVoteRoles?: string[];
    staffRoles?: (string | null)[];
*/

const config = new Collection<string, Config>();
// Test server
config.set(
  "907340495498407977",
  new Config({
    guildID: "907340495498407977",
    firstWarnRoleID: "1172919578641317939",
    secondWarnRoleID: "1172920021371072534",
    paroleRoleID: "1180542522062278707",
    prefix: ",",
    thinIceRoleID: "1187137588813893692",
    thinnerIceRoleID: "1187137637841113179",
    logChannelID: "1036213847293444166",
    staffApplicationsChannelID: "1195120979039502377",
    staffVoteChannelID: "1011952861325819984",
    staffVoteRoles: ["1191713864274939914"],
    staffRoles: [null, null, "907341095145472010"],
    highStaffRole: "1036654749891706961",
    aiEnabled: true,
    aiChannels: ["1011953546062745620"]
  })
);
// Lemomeme
config.set(
  "538903170189885460",
  new Config({
    guildID: "538903170189885460",
    firstWarnRoleID: "724839115828232232",
    secondWarnRoleID: "724839112192032798",
    paroleRoleID: "765883363520544778",
    prefix: ",",
    thinIceRoleID: "985333181538521128",
    thinnerIceRoleID: "985333604013965343",
    logChannelID: "1096117788516552795",
    staffApplicationsChannelID: "1096120117974290503",
    staffAppRoleID: "575811748284858368",
    staffVoteChannelID: "1096121574983225435",
    staffVoteRoles: ["553354789359058954"],
    staffRoles: [
      /*
      None,
      Retired,
      Farmer,
      Apple,
      Pineapple,
      Orange,
      Grapefruit,
      Lime,
      */
      null,
      "688607097948078092",
      "554006029365542922",
      "553354935425564713",
      "555585458281775115",
      "553354789359058954",
      "1124428178102948011",
      "594576990212849767",
    ],
    linkedStaffRoles: new Map([
      [StaffLevel.Farmer, "555134155395039256"], // Staff role
      [StaffLevel.Pineapple, "1162007763426234459"], // High staff role
    ]),
    highStaffRole: "1162007763426234459",
    aiEnabled: true,
    aiChannels: ["1096129798109143052", "1135348779877404869"]
  })
);
//House of VOX
config.set(
  "750868690416697424",
  new Config({
    guildID: "750868690416697424",
    firstWarnRoleID: "751144667814428854",
    secondWarnRoleID: "751144884270006323",
    paroleRoleID: "1211088029712777246",
    prefix: ",",
    thinIceRoleID: "1080304170663428126",
    thinnerIceRoleID: "1158485225924481065",
    logChannelID: "751745362842222632",
    staffApplicationsChannelID: "839276878145650708",
    staffAppRoleID: "750870953709535332",
    staffVoteChannelID: "937537883936534538",
    staffVoteRoles: [
      "750870599802290266",
      "1189725064640352327",
      "755680176809181244",
      "750869935353233418",
    ],
    staffRoles: [
      null,
      "757713206528704528",
      "784084772027891783",
      "751558655047893122",
      "1089338128101290104",
      "750870599802290266",
      "1189725064640352327",
    ],
    linkedStaffRoles: new Map([
      [StaffLevel.Farmer, "788690701759545386"], // Staff role
      [StaffLevel.Pineapple, "1210588048014843946"], // High staff role
    ]),
    highStaffRole: "1210588048014843946",
    appealServer: "https://discord.gg/EUsVK5E",
    aiEnabled: true,
    aiChannels: ["750868690915950715"]
  })
);
// Cozy lodge
config.set(
  "1220886191600308254",
  new Config({
    guildID: "1220886191600308254",
    firstWarnRoleID: "1222932763959890030",
    secondWarnRoleID: "1222932900421439641",
    paroleRoleID: "1222942964301697044",
    prefix: ",",
    thinIceRoleID: "1222945595551907850",
    thinnerIceRoleID: "1222945704348225688",
    logChannelID: "1222946063716192329",
    appealServer: "https://discord.gg/Q7Ee9SkeDb",
    highStaffRole: "1222893532545814598",
    linkedStaffRoles: new Map([
      [StaffLevel.Farmer, "1222892729646972948"], // Staff role
    ]),
    staffApplicationsChannelID: "1222947761453011066",
    staffRoles: [
      null,
      null,
      "1220886191616954481",
      "1220886191616954482",
      "1220886191616954484",
      "1220886191616954485", // crypt keeper
    ],
    staffVoteChannelID: "1220886193085087754",
    staffAppRoleID: "1220886191600308260",
    staffVoteRoles: ["1222893532545814598", "1220886191616954487"],
    aiEnabled: true,
    aiChannels: ["1222968152946901036"]
  })
);

export default config;
export let maintainanceMode = process.env.NODE_ENV ? true : false;
export const toggleMode = () => (maintainanceMode = !maintainanceMode);
export const devs = [
  "980280857958965328",
  "695228246966534255",
  "884036644234231819",
  "551032697578061858",
  "230122719511969792",
  "691321562179305492",
];
export const qrCodeAllowlist = [
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "instagram.com",
  "facebook.com",
];
export const hardResponses: Record<string, string> = {
  ",": "wh- what am i supposed to do? what do I even exist for? Who am I? What is my purpose? 😰",
  "<@1171528301072879707> you moderate discord servers": "oh my god.",
  "regex:^\\?afk.*":
    "I see you're using dyno's afk command. Sorry, but that's not available anymore! Use </afk:1213262685450276944> (or ,afk) instead!",
  "regex:^\\?av.*":
    "I see you're using dyno's avatar command. Sorry, but that's not available anymore! Use </avatar:1219416739587035228> (or ,av) instead!",
  "regex:fuck pomegranate": "hey fuck you too buddy",
};
export const testServer = "907340495498407977";
