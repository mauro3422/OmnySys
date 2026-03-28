/**
 * Detects exported pipeline atoms that look disconnected after re-analysis.
 */

import { createLogger } from '../../../utils/logger.js';
import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import { evaluateAtomTestability } from '../../../shared/compiler/index.js';
import { persistPipelineOrphanFinding } from './pipeline-orphan/pipeline-orphan-reporting.js';
import {
    loadPipelineOrphanEvidence,
    hasPipelineShape
} from './pipeline-orphan/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:pipeline-orphan');

export async function detectPipelineOrphans(rootPath, filePath, EventEmitterContext, options = {}) {
    const { atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'arch_pipeline_orphan_high');
        await clearWatcherIssue(rootPath, filePath, 'arch_pipeline_orphan_medium');

        const candidates = atoms.filter(hasPipelineShape);
        if (candidates.length === 0) {
            return [];
        }

        const {
            orphanAtoms: canonicalOrphans,
            deadCodeSummary
        } = loadPipelineOrphanEvidence(rootPath, filePath);
        const canonicalNames = new Set(canonicalOrphans.map((atom) => atom.name));
        const disconnected = candidates.filter((atom) =>
            canonicalNames.has(atom.name) &&
            getEffectiveCallerCount(atom) === 0 &&
            getEffectiveCalleeCount(atom) === 0
        );

        if (disconnected.length === 0) {
            return [];
        }

        const fileImporterCount = Math.max(
            ...canonicalOrphans.map((atom) => Number(atom.file_importer_count) || 0),
            0
        );

        const severity = disconnected.some((atom) => {
            const evaluation = evaluateAtomTestability(atom);
            return evaluation.severity === 'high' || evaluation.signals.complexity >= 20;
        }) ? 'high' : 'medium';

        await persistPipelineOrphanFinding({
            rootPath,
            filePath,
            disconnected,
            deadCodeSummary,
            fileImporterCount,
            severity,
            EventEmitterContext
        });

        if (verbose) {
            logger.warn(`[PIPELINE ORPHAN] ${filePath}: ${disconnected.length} exported pipeline atom(s) disconnected`);
        }

        return [{
            issueType: `arch:pipeline_orphan:${severity}`,
            severity,
            message: `Detected ${disconnected.length} exported pipeline atom(s) with no callers, no callees, and no file-level import evidence`,
            disconnectedAtoms: disconnected.map((atom) => atom.name)
        }];
    } catch (error) {
        logger.debug(`[PIPELINE ORPHAN GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

function getEffectiveCallerCount(atom) {
    if ((atom?.callersCount || atom?.callerCount || atom?.callers_count || 0) > 0) {
        return atom.callersCount || atom.callerCount || atom.callers_count || 0;
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

export default detectPipelineOrphans;
