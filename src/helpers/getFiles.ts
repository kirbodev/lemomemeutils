import { readdir } from "fs/promises";
import logger from "./logger.js";

export default async function getFiles(
  path: string,
  folders: boolean,
  absolute?: boolean,
): Promise<string[]> {
  const files: string[] = [];

  await readdir(path, { withFileTypes: true })
    .then(async (dirents) => {
      for (const dirent of dirents) {
        if (dirent.isDirectory() && folders) {
          if (!absolute) {
            files.push(dirent.name);
            continue;
          }
          files.push(`${path}/${dirent.name}`);
        } else if (dirent.isFile() && !folders) {
          if (!absolute) {
            files.push(dirent.name);
            continue;
          }
          files.push(`${path}/${dirent.name}`);
        }
      }
    })
    .catch((error) => {
      logger.error(error, "Error while getting files");
    });

  return files;
}
