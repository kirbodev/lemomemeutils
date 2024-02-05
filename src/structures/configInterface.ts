import { GuildTextBasedChannel, MessageCreateOptions } from "discord.js";
import { client } from "..";
import logger from "../helpers/logger";
import { StaffLevel } from "./staffInterface";

interface ConfigParams {
  guildID: string;
  firstWarnRoleID: string;
  secondWarnRoleID: string;
  paroleRoleID: string;
  prefix?: string;
  thinIceRoleID?: string;
  thinnerIceRoleID?: string;
  logChannelID?: string;
  staffApplicationsChannelID?: string;
  staffAppRoleID?: string;
  staffVoteChannelID?: string;
  staffVoteRoles?: string[];
  staffRoles?: (string | null)[];
  linkedStaffRoles?: Map<StaffLevel, string>;
}
export default class Config {
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
  staffAppRoleID?: string;
  staffVoteChannelID?: string;
  staffVoteRoles?: string[];
  staffRoles?: (string | null)[];
  linkedStaffRoles?: Map<StaffLevel, string>; // If >= StaffLevel, they get the role

  constructor(params: ConfigParams) {
    this.guildID = params.guildID;
    this.firstWarnRoleID = params.firstWarnRoleID;
    this.secondWarnRoleID = params.secondWarnRoleID;
    this.paroleRoleID = params.paroleRoleID;
    this.prefix = process.env.NODE_ENV ? `d${params.prefix}` : params.prefix;
    this.thinIceRoleID = params.thinIceRoleID;
    this.thinnerIceRoleID = params.thinnerIceRoleID;
    this.logChannelID = params.logChannelID;
    this.staffApplicationsChannelID = params.staffApplicationsChannelID;
    this.staffAppRoleID = params.staffAppRoleID;
    this.staffVoteChannelID = params.staffVoteChannelID;
    this.staffVoteRoles = params.staffVoteRoles;
    this.staffRoles = params.staffRoles;
    this.linkedStaffRoles = params.linkedStaffRoles;

    if (!this.prefix) this.prefix = ",";
    client.channels
      .fetch(this.logChannelID!)
      .then((channel) => (this.logChannel = channel as GuildTextBasedChannel))
      .catch(() =>
        logger.error(`Could not find log channel for guild ${this.guildID}`)
      );
  }

  log(options: MessageCreateOptions = {}) {
    if (!this.logChannelID || !this.logChannel) return;
    this.logChannel.send({ ...options });
  }
}
