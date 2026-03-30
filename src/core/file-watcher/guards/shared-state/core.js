import { createLogger } from '../../../../utils/logger.js';
import { collectSharedStateContentionEvidence } from './evidence.js';
import { reportSharedStateContentionIssue } from './reporting.js';

const logger = createLogger('OmnySys:file-watcher:guards:shared-state');

export async function detectSharedStateContention(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const { verbose = true } = options;

    try {
        const evidence = await collectSharedStateContentionEvidence(rootPath, filePath, atoms, options);
        if (!evidence) return null;
        return await reportSharedStateContentionIssue(rootPath, filePath, evidence, EventEmitterContext, verbose, logger);
    } catch (error) {
        logger.debug(`[SHARED STATE GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}

export default detectSharedStateContention;
