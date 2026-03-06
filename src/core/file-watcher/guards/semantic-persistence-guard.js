/**
 * Detects when semantic compiler metadata was extracted in-memory but not persisted correctly.
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isValidGuardTarget
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:semantic-persistence');
const TEST_FILE_PATTERNS = /(^|\/)(tests?|__tests__|fixtures)\//i;

function hasPersistedJson(value) {
    return value !== null && value !== undefined && value !== '' && value !== 'null';
}

function parseJsonValue(value, fallback = null) {
    if (!hasPersistedJson(value)) return fallback;
    if (typeof value !== 'string') return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function getTargetNames(atoms = []) {
    return atoms
        .filter(isValidGuardTarget)
        .map((atom) => atom?.name)
        .filter(Boolean);
}

export async function detectSemanticPersistence(rootPath, filePath, EventEmitterContext, options = {}) {
    const { atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'sem_persistence_gap_high');
        await clearWatcherIssue(rootPath, filePath, 'sem_persistence_gap_medium');

        if (TEST_FILE_PATTERNS.test(filePath)) {
            return [];
        }

        const targetNames = getTargetNames(atoms);
        if (targetNames.length === 0) {
            return [];
        }

        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        const db = repo?.db || null;
        if (!db) {
            return [];
        }

        const placeholders = targetNames.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT
                id,
                name,
                atom_type,
                dna_json,
                data_flow_json,
                signature_json
            FROM atoms
            WHERE file_path = ?
              AND name IN (${placeholders})
              AND (is_removed IS NULL OR is_removed = 0)
        `).all(filePath, ...targetNames);

        if (rows.length === 0) {
            return [];
        }

        const persistedTargets = rows.filter((row) => isValidGuardTarget({
            type: row.atom_type,
            name: row.name,
            isRemoved: false,
            isDeadCode: false
        }));

        if (persistedTargets.length === 0) {
            return [];
        }

        const missingDna = [];
        const missingDataFlow = [];
        const missingSignature = [];

        for (const row of persistedTargets) {
            if (!hasPersistedJson(row.dna_json)) {
                missingDna.push(row.name);
            }

            const dataFlow = parseJsonValue(row.data_flow_json);
            if (!dataFlow || typeof dataFlow !== 'object') {
                missingDataFlow.push(row.name);
            }

            const signature = parseJsonValue(row.signature_json);
            if (!signature || typeof signature !== 'object') {
                missingSignature.push(row.name);
            }
        }

        if (missingDna.length === 0 && missingDataFlow.length === 0 && missingSignature.length === 0) {
            return [];
        }

        const missingAny = new Set([...missingDna, ...missingDataFlow, ...missingSignature]);
        const ratio = persistedTargets.length > 0 ? missingAny.size / persistedTargets.length : 0;
        const severity = ratio >= 0.5 || missingDna.length > 0 ? 'high' : 'medium';
        const issueType = createIssueType(IssueDomains.SEM, 'persistence_gap', severity);
        const message = `Semantic persistence gap after indexing: ${missingAny.size}/${persistedTargets.length} persisted atoms are missing DNA/data-flow/signature coverage`;

        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            createStandardContext({
                guardName: 'semantic-persistence-guard',
                severity,
                metricValue: missingAny.size,
                threshold: persistedTargets.length,
                suggestedAction: 'Inspect converter/persistence mapping for derived semantic fields and reindex the affected file.',
                suggestedAlternatives: [
                    StandardSuggestions.IMPACT_REVIEW,
                    'Compare in-memory atoms vs persisted rows for dna_json, data_flow_json and signature_json.',
                    'Re-run incremental analysis and verify semantic metadata survives storage conversion.'
                ],
                extraData: {
                    persistedTargets: persistedTargets.length,
                    missingDna,
                    missingDataFlow,
                    missingSignature
                }
            })
        );

        EventEmitterContext.emit('sem:persistence-gap', {
            filePath,
            severity,
            persistedTargets: persistedTargets.length,
            missingDna,
            missingDataFlow,
            missingSignature
        });

        if (verbose) {
            logger.warn(`[SEM-PERSISTENCE] ${filePath}: dna=${missingDna.length}, dataFlow=${missingDataFlow.length}, signature=${missingSignature.length}`);
        }

        return [{
            issueType,
            severity,
            message,
            missingDna,
            missingDataFlow,
            missingSignature
        }];
    } catch (error) {
        logger.debug(`[SEM-PERSISTENCE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectSemanticPersistence;
