import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { detectCycles } from '../../../../layer-graph/algorithms/cycle-detector.js';
import { normalizePath } from '../../../../shared/utils/path-utils.js';
import { clearCircularIssues } from './issue-service.js';
import { getCircularFileImports, getCircularLocalAtoms } from './repository.js';
import {
    persistModuleCycleIssue,
    persistLifecycleCycleIssue,
    persistFunctionalCycleIssue,
    isLikelyInfrastructureCycleAtom
} from './persistence.js';
import { buildCircularFileGraph } from './detection-file-graph.js';
import { detectCircularAtomCycles } from './detection-atom-cycles.js';

const logger = createLogger('OmnySys:file-watcher:guards:circular');

export async function detectCircularDependencies(rootPath, filePath, repo) {
    const relPath = normalizePath(path.relative(rootPath, filePath));

    if (!repo || !repo.db) {
        logger.debug(`[CIRCULAR GUARD SKIP] No DB connection for ${relPath}`);
        return null;
    }

    try {
        const allFiles = getCircularFileImports(repo.db);
        const fileGraph = buildCircularFileGraph(allFiles);
        const cycles = detectCycles(fileGraph);
        const fileCycle = cycles.find((cycle) => cycle.includes(relPath)) || null;

        if (fileCycle) {
            await persistModuleCycleIssue(rootPath, filePath, fileCycle);
        } else {
            await clearCircularIssues(rootPath, filePath);
        }

        const localAtoms = getCircularLocalAtoms(repo.db, relPath);

        if (localAtoms.length === 0) {
            return { fileCycle, atomCycle: null };
        }

        return detectCircularAtomCycles({
            rootPath,
            filePath,
            relPath,
            localAtoms,
            fileCycle,
            persistLifecycleCycleIssue,
            persistFunctionalCycleIssue,
            clearCircularIssues,
            isLikelyInfrastructureCycleAtom,
            logger
        });
    } catch (error) {
        logger.error(`[CIRCULAR GUARD FAILED] ${error.message}`);
        return null;
    }
}
