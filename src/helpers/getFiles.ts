import { readdir } from "fs/promises";
import logger from "./logger";

export default async function getFiles(path: string, folders: boolean): Promise<string[]> {
    const files: string[] = [];

    await readdir(path, { withFileTypes: true }).then(async (dirents) => {
        for (const dirent of dirents) {
            if (dirent.isDirectory() && folders) {
                files.push(`${path}/${dirent.name}`);
            } else if (dirent.isFile() && !folders) {
                files.push(`${path}/${dirent.name}`);
            }
        }
    }).catch((error) => {
        logger.error(error, 'Error while getting files');
    });

    return files;
}