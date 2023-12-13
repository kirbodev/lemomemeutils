import { agenda } from "..";
import logger from "../helpers/logger";
logger.info("Run jobs: Started")

let jobsFinished = 0;
Object.keys(agenda.definitions).forEach(async (key) => {
    const definition = agenda.definitions[key];
    logger.info(`Run jobs: Running ${key}`);
    // @ts-expect-error types are wrong
    await definition.fn();
    jobsFinished++;
    logger.info(`Run jobs: Finished ${key}`);
    if (jobsFinished === Object.keys(agenda.definitions).length) {
        logger.info("Run jobs: Finished all jobs");
        process.exit(0);
    }
});