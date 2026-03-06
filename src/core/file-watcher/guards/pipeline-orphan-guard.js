/**
 * Detects exported pipeline atoms that look disconnected after re-analysis.
 */

import Database from 'better-sqlite3';
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { evaluateAtomTestability } from '../../../shared/compiler/index.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isValidGuardTarget
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:pipeline-orphan');
const PIPELINE_NAME_PATTERN = /(persist|analyze|compute|calculate|build|generate|process|index)/i;

function getEffectiveCallerCount(atom) {
    if ((atom?.callersCount || atom?.callerCount || atom?.callers_count || 0) > 0) {
        return atom.callersCount || atom.callerCount || atom.callers_count || 0;
    }

    const calledBy = atom?.calledBy || atom?.called_by_json;
    if (Array.isArray(calledBy)) return calledBy.length;

    if (typeof calledBy === 'string' && calledBy && calledBy !== '[]') {
        try {
            const parsed = JSON.parse(calledBy);
            return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
            return 0;
        }
    }

    return 0;
}

function getEffectiveCalleeCount(atom) {
    return Math.max(
        Number(atom?.calleesCount) || 0,
        Number(atom?.calleeCount) || 0,
        Number(atom?.callees_count) || 0,
        Array.isArray(atom?.calls) ? atom.calls.length : 0
    );
}

function isProductionPipelineFile(filePath = '') {
    return typeof filePath === 'string'
        && filePath.startsWith('src/')
        && !filePath.startsWith('tests/')
        && !filePath.startsWith('scripts/');
}

function hasPipelineShape(atom) {
    if (!isValidGuardTarget(atom)) return false;
    if (!(atom?.isExported || atom?.is_exported)) return false;
    const filePath = atom.filePath || atom.file_path || '';
    if (!isProductionPipelineFile(filePath)) return false;
    return PIPELINE_NAME_PATTERN.test(atom?.name || '');
}

function countFileImporters(rootPath, filePath) {
    try {
        const db = new Database(`${rootPath}/.omnysysdata/omnysys.db`, { readonly: true });
        const row = db.prepare(`
            SELECT COUNT(*) as c
            FROM files
            WHERE path != ?
              AND imports_json LIKE '%' || ? || '%'
        `).get(filePath, filePath);
        db.close();
        return row?.c || 0;
    } catch {
        return 0;
    }
}

export async function detectPipelineOrphans(rootPath, filePath, EventEmitterContext, options = {}) {
    const { atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'arch_pipeline_orphan_high');
        await clearWatcherIssue(rootPath, filePath, 'arch_pipeline_orphan_medium');

        const candidates = atoms.filter(hasPipelineShape);
        if (candidates.length === 0) {
            return [];
        }

        const fileImporterCount = countFileImporters(rootPath, filePath);
        const disconnected = candidates.filter((atom) =>
            getEffectiveCallerCount(atom) === 0 &&
            getEffectiveCalleeCount(atom) === 0 &&
            fileImporterCount === 0
        );

        if (disconnected.length === 0) {
            return [];
        }

        const severity = disconnected.some((atom) => {
            const evaluation = evaluateAtomTestability(atom);
            return evaluation.severity === 'high' || evaluation.signals.complexity >= 20;
        }) ? 'high' : 'medium';
        const issueType = createIssueType(IssueDomains.ARCH, 'pipeline_orphan', severity);
        const message = `Detected ${disconnected.length} exported pipeline atom(s) with no callers, no callees, and no file-level import evidence`;

        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            createStandardContext({
                guardName: 'pipeline-orphan-guard',
                severity,
                threshold: 0,
                metricValue: disconnected.length,
                suggestedAction: 'Verify whether this export is actually wired into the production pipeline or can be removed.',
                suggestedAlternatives: [
                    StandardSuggestions.IMPACT_REVIEW,
                    'If the module is integrated by import only, ensure file_dependencies/import metadata is persisted.',
                    'If the export is obsolete, remove it or move it to test/support code.'
                ],
                extraData: {
                    fileImporterCount,
                    disconnectedAtoms: disconnected.slice(0, 10).map((atom) => ({
                        name: atom.name,
                        complexity: atom.complexity || 0,
                        atomType: atom.type || atom.atom_type || 'unknown'
                    }))
                }
            })
        );

        EventEmitterContext.emit('arch:pipeline-orphan', {
            filePath,
            severity,
            fileImporterCount,
            disconnectedAtoms: disconnected.map((atom) => atom.name)
        });

        if (verbose) {
            logger.warn(`[PIPELINE ORPHAN] ${filePath}: ${disconnected.length} exported pipeline atom(s) disconnected`);
        }

        return [{
            issueType,
            severity,
            message,
            disconnectedAtoms: disconnected.map((atom) => atom.name)
        }];
    } catch (error) {
        logger.debug(`[PIPELINE ORPHAN GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectPipelineOrphans;
