import mongoose from 'mongoose';
import logger from '../helpers/logger';
import warn from './models/warn';
import action from './models/action';

try {
    await mongoose.connect(process.env.MONGO_CONNECTION as string);
    logger.info('Connected to database');
} catch (e) {
    logger.error(e, 'Error while connecting to database');
}

export const Warn = warn;
export const Action = action;
export default mongoose;