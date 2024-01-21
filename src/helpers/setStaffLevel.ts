import { HydratedDocument } from "mongoose";
import staffInterface, { StaffLevel } from "../structures/staffInterface";
import configs from "../config";
import { client } from "..";
import logger from "./logger";

export default async function setStaffLevel(staff: HydratedDocument<staffInterface>, level: StaffLevel) {
    const config = configs.get(staff.guildID)!;
    if (!config.staffRoles) return;
    if (!Object.values(StaffLevel).includes(level)) return;
    const oldRoleId = config.staffRoles[staff.staffLevel] ? config.staffRoles[staff.staffLevel] : undefined;
    staff.staffLevel = level;
    const guild = client.guilds.cache.get(staff.guildID);
    if (!guild) return;
    const member = await guild.members.fetch(staff.userID).catch(() => undefined);
    if (!member) return;
    const role = config.staffRoles[staff.staffLevel] !== null ? guild.roles.cache.get(config.staffRoles[staff.staffLevel]!) : undefined;
    const oldRole = oldRoleId ? guild.roles.cache.get(oldRoleId) : undefined;
    try {
        if (oldRole) await member.roles.remove(oldRole);
        if (role) await member.roles.add(role);
    } catch (e) {
        return logger.error(`Failed to change staff level for ${staff.userID} in ${staff.guildID}`);
    }
    return await staff.save();
}