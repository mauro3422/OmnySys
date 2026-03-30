/**
 * Detects semantic patterns in code that are not reflected in extracted metadata.
 */

import { createLogger } from '../../../../utils/logger.js';
import { clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { loadSemanticCoverageEvidence } from './evidence.js';
import { persistSemanticCoverageFinding } from './reporting.js';

const logger = createLogger('OmnySys:file-watcher:guards:semantic-coverage');

export async function detectSemanticCoverage(rootPath, filePath, EventEmitterContext, options = {}) {
    const { atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'sem_coverage_gap_high');
        await clearWatcherIssue(rootPath, filePath, 'sem_coverage_gap_medium');

        if (!Array.isArray(atoms) || atoms.length === 0) {
            return [];
        }

        const evidence = await loadSemanticCoverageEvidence(rootPath, filePath, atoms);
        if (!evidence) {
            return [];
        }

        const finding = await persistSemanticCoverageFinding({
            rootPath,
            filePath,
            evidence,
            EventEmitterContext
        });

        if (verbose) {
            logger.warn(`[SEM-COVERAGE] ${filePath}: ${finding.message}`);
        }

        return [finding];
    } catch (error) {
        logger.debug(`[SEM-COVERAGE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectSemanticCoverage;
