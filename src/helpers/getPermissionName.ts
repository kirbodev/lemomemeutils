import { PermissionsBitField } from "discord.js";

export default function (permission: bigint): string {
  for (const perm of Object.keys(PermissionsBitField.Flags)) {
    if (
      PermissionsBitField.Flags[
        perm as keyof typeof PermissionsBitField.Flags
      ] === permission
    )
      return perm;
  }
  return "unknown";
}
