import { Schema, model, Document } from "mongoose";

interface NameLock extends Document {
  guildId: string;
  userId: string;
  lockedName: string;
}

const NameLockSchema = new Schema<NameLock>({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  lockedName: { type: String, required: true },
});

const NameLockModel = model<NameLock>("NameLock", NameLockSchema);

export const setNameLock = async (
  guildId: string,
  userId: string,
  lockedName: string
) => {
  await NameLockModel.updateOne(
    { guildId, userId },
    { $set: { lockedName } },
    { upsert: true }
  );
};

export const getNameLock = async (guildId: string, userId: string) => {
  return NameLockModel.findOne({ guildId, userId }).exec();
};

export const removeNameLock = async (guildId: string, userId: string) => {
  await NameLockModel.deleteOne({ guildId, userId }).exec();
};

export default NameLockModel;
