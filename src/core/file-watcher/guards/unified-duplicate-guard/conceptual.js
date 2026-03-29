import { createLogger } from '../../../../utils/logger.js';
import {
    loadConceptualLocalAtoms,
    detectConceptualFindings
} from '../duplicate-conceptual/index.js';
import { isLowSignalName } from '../guard-standards.js';
import { summarizeAtomTestability } from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate:conceptual');

export async function runConceptualDuplicateGuard(repo, rootPath, normalizedFilePath, options = {}) {
    const { maxFindings = 10, minLinesOfCode = 3 } = options;

    try {
        const localAtoms = loadConceptualLocalAtoms(repo, normalizedFilePath, minLinesOfCode);

        if (localAtoms.length === 0) {
            return [];
        }

        const testabilitySummary = summarizeAtomTestability(localAtoms);
        return await detectConceptualFindings(
            repo,
            normalizedFilePath,
            localAtoms,
            maxFindings,
            isLowSignalName,
            testabilitySummary.severity,
            rootPath
        );
    } catch (error) {
        logger.debug(`[CONCEPTUAL GUARD SKIP] ${normalizedFilePath}: ${error.message}`);
        return [];
    }
}
