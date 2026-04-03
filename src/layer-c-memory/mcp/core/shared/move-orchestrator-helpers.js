import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { runAsyncBoundary } from '../../../../shared/compiler/index.js';
import {
    normalizeComparisonPath as normalizeComparisonPathShared,
    normalizeSnapshotPath as normalizeSnapshotPathShared
} from '../../../../shared/compiler/index.js';
import { getFileDependents } from '#layer-c/query/apis/file-api.js';
import { calculateRelativeImport, normalizeImportToAbsolute } from '../../../../utils/path-utils.js';

const logger = createLogger('OmnySys:move:helpers');
const MOVE_INDEXER_WAIT_ATTEMPTS = 50;
const MOVE_INDEXER_WAIT_MS = 200;

export function normalizeComparisonPath(filePath = '') {
    return normalizeComparisonPathShared(filePath);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForBackgroundIndexer(orchestrator) {
    return await runAsyncBoundary('waitForBackgroundIndexer', async () => {
        try {
            if (!orchestrator) {
                return;
            }

            logger.info('[MoveOrchestrator] Synchronizing with background indexer...');
            let attempts = 0;
            while (attempts < MOVE_INDEXER_WAIT_ATTEMPTS && (orchestrator.queue?.size() > 0 || orchestrator.activeJobs > 0)) {
                await wait(MOVE_INDEXER_WAIT_MS);
                attempts++;
            }
        } catch (error) {
            throw error;
        }
    });
}

export function resolveDependentsFromSnapshot(oldPath, snapshot) {
    if (!snapshot) {
        return null;
    }

    const normalizedOldPath = normalizeSnapshotPathShared(oldPath);
    const directMap = snapshot.dependentsBySourcePath;

    if (directMap instanceof Map) {
        const direct = directMap.get(normalizedOldPath) || directMap.get(oldPath);
        if (Array.isArray(direct)) {
            return direct;
        }
    }

    if (typeof snapshot.getDependentsForPath === 'function') {
        const resolved = snapshot.getDependentsForPath(normalizedOldPath);
        if (Array.isArray(resolved)) {
            return resolved;
        }
    }

    if (Array.isArray(snapshot.dependents)) {
        return snapshot.dependents;
    }

    return null;
}

export async function collectMoveDependents(oldPath, projectPath, snapshot) {
    return await runAsyncBoundary('collectMoveDependents', async () => {
        try {
            const snapshotDependents = resolveDependentsFromSnapshot(oldPath, snapshot);
            if (Array.isArray(snapshotDependents)) {
                return snapshotDependents;
            }

            return await getFileDependents(projectPath, oldPath);
        } catch (error) {
            throw error;
        }
    });
}

export function findModuleSourceLineIndex(code, moduleSource) {
    return code.split('\n').findIndex((line) => line.includes(`'${moduleSource}'`) || line.includes(`"${moduleSource}"`));
}

export function findMatchingMoveImport(imports, depPath, oldPath, projectPath) {
    const normalizedOldTarget = normalizeComparisonPathShared(path.resolve(projectPath, oldPath));

    return imports.find((imp) => {
        const absResolved = normalizeImportToAbsolute(imp, depPath, projectPath);
        const normResolved = normalizeComparisonPathShared(absResolved);
        return normResolved === normalizedOldTarget;
    }) || null;
}
