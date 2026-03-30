/**
 * Detects production atoms whose derived compiler metadata is still empty.
 */

import { createLogger } from '../../../../utils/logger.js';
import { clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { loadMetadataCompletenessEvidence } from './evidence.js';
import { persistMetadataCompletenessFinding } from './reporting.js';

const logger = createLogger('OmnySys:file-watcher:guards:metadata-completeness');

export async function detectMetadataCompleteness(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const { verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'code_metadata_completeness_high');
        await clearWatcherIssue(rootPath, filePath, 'code_metadata_completeness_medium');

        const evidence = loadMetadataCompletenessEvidence(atoms, filePath);
        if (!evidence) {
            return [];
        }

        const finding = await persistMetadataCompletenessFinding({
            rootPath,
            filePath,
            evidence,
            EventEmitterContext
        });

        if (verbose) {
            logger.warn(`[METADATA] ${filePath}: ${finding.missingAtoms}/${finding.candidateAtoms} atoms missing derived scores`);
        }

        return [finding];
    } catch (error) {
        logger.debug(`[METADATA GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectMetadataCompleteness;
