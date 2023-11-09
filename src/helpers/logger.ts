import pino from 'pino';
import logCleanup from './logCleanup';

logCleanup();

const transport = pino.transport({
    targets: [
        {
            level: process.env.PINO_LOG_LEVEL ? process.env.PINO_LOG_LEVEL : 'info',
            target: 'pino/file',
            options: {
                // ISO string is an invalid file name so replace colons with dashes
                destination: `./logs/LOG-${new Date(Date.now()).toISOString().replace(/:/g, '-')}.log`,
                mkdir: true
            },
        },
        {
            level: process.env.PINO_LOG_LEVEL ? process.env.PINO_LOG_LEVEL : 'info',
            target: 'pino-pretty',
            options: {
                destination: 1,
            },
        }
    ]
});

const logger = pino({
    level: process.env.PINO_LOG_LEVEL ? process.env.PINO_LOG_LEVEL : 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
}, transport);

logger.info('Logger initialized');

export default logger;