// Dangerous actions will require TOTP authentication to prevent an account being compromised to lead to the entire system being fucked :)
import { HydratedDocument } from "mongoose";
import Dev from "../db/models/dev.js";
import speakeasy from "speakeasy";
import devInterface from "../structures/devInterface.js";

export default async function (
  secret: string,
  code: string,
): Promise<boolean | undefined> {
  const dev: HydratedDocument<devInterface> | null = await Dev.findOne({
    secret,
  });

  const verified = speakeasy.totp.verify({
    secret,
    token: code,
  });
  if (verified && dev) {
    dev.lastVerified = new Date();
    await dev.save();
  }
  return verified;
}
