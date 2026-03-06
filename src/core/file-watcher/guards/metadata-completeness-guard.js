/**
 * Detects production atoms whose derived compiler metadata is still empty.
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { summarizeDerivedScoreCoverage } from '../../../shared/compiler/index.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isValidGuardTarget,
    extractAtomMetrics
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:metadata-completeness');

export async function detectMetadataCompleteness(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const { verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'code_metadata_completeness_high');
        await clearWatcherIssue(rootPath, filePath, 'code_metadata_completeness_medium');

        if (!Array.isArray(atoms) || atoms.length === 0) {
            return [];
        }

        const coverage = summarizeDerivedScoreCoverage(atoms, { filePath });
        const candidates = coverage.candidates.filter(isValidGuardTarget);

        if (candidates.length === 0) {
            return [];
        }

        const missingAtoms = coverage.missingAtoms.filter(isValidGuardTarget);

        if (missingAtoms.length === 0) {
            return [];
        }

        const ratio = coverage.missingRatio;
        const hasHighSignalAtom = missingAtoms.some((atom) => {
            const metrics = extractAtomMetrics(atom);
            return metrics.complexity >= 10 || metrics.isAsync || metrics.isExported;
        });

        let severity = null;
        if (ratio >= 1 && (candidates.length >= 2 || hasHighSignalAtom)) severity = 'high';
        else if (ratio >= 0.5) severity = 'medium';

        if (!severity) {
            return [];
        }

        const issueType = createIssueType(IssueDomains.CODE, 'metadata_completeness', severity);
        const sampleAtoms = coverage.sampleAtoms;
        const message = `Derived graph metadata missing for ${missingAtoms.length}/${candidates.length} production atoms (fragility/coupling/cohesion all zero)`;

        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            createStandardContext({
                guardName: 'metadata-completeness-guard',
                metricValue: missingAtoms.length,
                threshold: candidates.length,
                severity,
                suggestedAction: 'Derived compiler metadata is missing. Trigger a reindex or inspect enrichment/persistence.',
                suggestedAlternatives: [
                    StandardSuggestions.IMPACT_REVIEW,
                    'Check persistGraphMetrics() and downstream graph enrichment.',
                    'Verify watcher analysis ran deep enough to populate derived scores.'
                ],
                extraData: {
                    candidateAtoms: candidates.length,
                    missingAtoms: missingAtoms.length,
                    missingRatio: Number(ratio.toFixed(3)),
                    sampleAtoms
                }
            })
        );

        EventEmitterContext.emit('code:metadata-completeness', {
            filePath,
            severity,
            candidateAtoms: candidates.length,
            missingAtoms: missingAtoms.length,
            sampleAtoms
        });

        if (verbose) {
            logger.warn(`[METADATA] ${filePath}: ${missingAtoms.length}/${candidates.length} atoms missing derived scores`);
        }

        return [{
            issueType,
            severity,
            message,
            sampleAtoms
        }];
    } catch (error) {
        logger.debug(`[METADATA GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectMetadataCompleteness;
