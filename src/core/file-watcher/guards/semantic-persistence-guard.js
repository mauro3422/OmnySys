/**
 * Detects when semantic compiler metadata was extracted in-memory but not persisted correctly.
 */

import { createLogger } from '../../../utils/logger.js';
import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import { loadSemanticPersistenceEvidence } from './semantic-persistence-evidence.js';
import { persistSemanticPersistenceFinding } from './semantic-persistence-reporting.js';

const logger = createLogger('OmnySys:file-watcher:guards:semantic-persistence');
const TEST_FILE_PATTERNS = /(^|\/)(tests?|__tests__|fixtures)\//i;

export async function detectSemanticPersistence(rootPath, filePath, EventEmitterContext, options = {}) {
    const { atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'sem_persistence_gap_high');
        await clearWatcherIssue(rootPath, filePath, 'sem_persistence_gap_medium');

        if (TEST_FILE_PATTERNS.test(filePath)) {
            return [];
        }

        const evidence = await loadSemanticPersistenceEvidence(rootPath, filePath, atoms);
        if (!evidence) {
            return [];
        }

        const finding = await persistSemanticPersistenceFinding({
            rootPath,
            filePath,
            evidence,
            EventEmitterContext
        });

        if (verbose) {
            logger.warn(
                `[SEM-PERSISTENCE] ${filePath}: dna=${finding.missingDna.length}, dataFlow=${finding.missingDataFlow.length}, signature=${finding.missingSignature.length}`
            );
        }

        return [finding];
    } catch (error) {
        logger.debug(`[SEM-PERSISTENCE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectSemanticPersistence;
