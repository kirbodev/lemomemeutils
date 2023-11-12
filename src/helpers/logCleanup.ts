// Cleanup log files by removing all but the most recent 10 to prevent the logs directory from growing too large

import logger from './logger';

import fs from 'fs';
import path from 'path'
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logDir = path.join(__dirname, '../../logs');

export default () => {
    fs.readdir(logDir, (err, files) => {
        if (err) {
            return logger.error(err, "Error cleaning up logs");
        }

        files.sort((a, b) => {
            return fs.statSync(path.join(logDir, a)).mtime.getTime() - fs.statSync(path.join(logDir, b)).mtime.getTime();
        });

        if (files.length > 10) {
            const toRemove = files.slice(0, files.length - 10);
            toRemove.forEach((file) => {
                fs.unlink(path.join(logDir, file), (err) => {
                    if (err) {
                        logger.error(err, "Error cleaning up logs");
                    }
                });
            });
        }

        logger.info("Log cleanup complete");
    })
};