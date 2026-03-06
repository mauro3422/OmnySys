/**
 * Detects semantic patterns in code that are not reflected in extracted metadata.
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { summarizeSemanticCoverage } from '../../../shared/compiler/index.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isValidGuardTarget
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:semantic-coverage');

export async function detectSemanticCoverage(rootPath, filePath, EventEmitterContext, options = {}) {
    const { atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'sem_coverage_gap_high');
        await clearWatcherIssue(rootPath, filePath, 'sem_coverage_gap_medium');

        if (!Array.isArray(atoms) || atoms.length === 0) {
            return [];
        }

        const candidates = atoms.filter(isValidGuardTarget);
        if (candidates.length === 0) {
            return [];
        }

        const atomIds = candidates.map((atom) => atom.id).filter(Boolean);
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        const db = repo?.db || null;

        let sharesStateRelations = 0;
        if (db && atomIds.length > 0) {
            const placeholders = atomIds.map(() => '?').join(',');
            sharesStateRelations = db.prepare(`
                SELECT COUNT(*) AS n
                FROM atom_relations
                WHERE relation_type = 'shares_state'
                  AND (source_id IN (${placeholders}) OR target_id IN (${placeholders}))
            `).get(...atomIds, ...atomIds)?.n || 0;
        }

        const {
            networkCandidates,
            networkFlagged,
            sharedStateCandidates,
            gaps,
            severity
        } = summarizeSemanticCoverage(candidates, { filePath, sharesStateRelations });

        if (gaps.length === 0) {
            return [];
        }

        const issueType = createIssueType(IssueDomains.SEM, 'coverage_gap', severity);
        const message = gaps.map((gap) => gap.message).join('; ');

        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            createStandardContext({
                guardName: 'semantic-coverage-guard',
                severity,
                suggestedAction: 'Re-run semantic extraction for this file and inspect missing flags/relations.',
                suggestedAlternatives: [
                    StandardSuggestions.ASYNC_ADD_TRY_CATCH,
                    'Check network/shared-state extractors for this syntax pattern.',
                    'Verify semantic relations are persisted after Phase 2 or watcher indexing.'
                ],
                extraData: {
                    gaps,
                    networkCandidates: networkCandidates.length,
                    networkFlagged: networkFlagged.length,
                    sharedStateCandidates: sharedStateCandidates.length,
                    sharesStateRelations
                }
            })
        );

        EventEmitterContext.emit('sem:coverage-gap', {
            filePath,
            severity,
            gaps,
            networkCandidates: networkCandidates.length,
            sharedStateCandidates: sharedStateCandidates.length
        });

        if (verbose) {
            logger.warn(`[SEM-COVERAGE] ${filePath}: ${message}`);
        }

        return [{
            issueType,
            severity,
            message,
            gaps
        }];
    } catch (error) {
        logger.debug(`[SEM-COVERAGE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectSemanticCoverage;
