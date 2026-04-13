import { createLogger } from '../../../../utils/logger.js';
import { executeDuplicateRisk } from './index.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');

export async function detectDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    try {
        return await executeDuplicateRisk(rootPath, filePath, EventEmitterContext, options);
    } catch (error) {
        logger.debug(`[DUPLICATE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectDuplicateRisk;
