import { GuildTextBasedChannel, MessageCreateOptions } from "discord.js";
import { client } from "..";
import logger from "../helpers/logger";

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

    constructor(
        guildID: string,
        firstWarnRoleID: string,
        secondWarnRoleID: string,
        paroleRoleID: string,
        prefix?: string,
        thinIceRoleID?: string,
        thinnerIceRoleID?: string,
        logChannelID?: string
    ) {
        this.guildID = guildID;
        this.firstWarnRoleID = firstWarnRoleID;
        this.secondWarnRoleID = secondWarnRoleID;
        this.paroleRoleID = paroleRoleID;
        this.prefix = prefix;
        this.thinIceRoleID = thinIceRoleID;
        this.thinnerIceRoleID = thinnerIceRoleID;
        this.logChannelID = logChannelID;

        if (!this.prefix) this.prefix = ",";
        client.channels.fetch(this.logChannelID!)
            .then(channel => this.logChannel = channel as GuildTextBasedChannel)
            .catch(() => logger.error(`Could not find log channel for guild ${this.guildID}`));
    }

    log(options: MessageCreateOptions = {}) {
        if (!this.logChannelID || !this.logChannel) return;
        this.logChannel.send({ ...options });
    }
}