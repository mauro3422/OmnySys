/**
 * @fileoverview circular-guard.js
 *
 * Detecta ciclos de dependencias circulares (imports y llamadas de funciones).
 * Previene acoplamiento circular y recursión infinita.
 *
 * @module core/file-watcher/guards/circular-guard
 * @version 2.1.0 - Refactorizado
 */

import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { createStandardContext } from './guard-standards.js';
import { safeArray, classifyCircularCycle } from '../../../shared/compiler/index.js';
import { normalizePath } from '../../../shared/utils/path-utils.js';
import { persistCircularIssue, clearCircularIssues } from './circular-issue-service.js';
import {
    getCircularCallRelations,
    getCircularFileImports,
    getCircularLocalAtoms,
    prepareFileDependencyLookup
} from './circular-repository.js';

const logger = createLogger('OmnySys:file-watcher:guards:circular');

function findCycleDFS(startId, getChildrenFn) {
    const visited = new Set();
    const recursionStack = new Set();
    const pathStack = [];
    let foundCycle = null;

    function dfs(currentId) {
        if (foundCycle) return;

        visited.add(currentId);
        recursionStack.add(currentId);
        pathStack.push(currentId);

        const children = getChildrenFn(currentId) || [];
        for (const child of children) {
            if (!visited.has(child)) {
                dfs(child);
            } else if (recursionStack.has(child)) {
                const cycleStartIndex = pathStack.indexOf(child);
                foundCycle = pathStack.slice(cycleStartIndex).concat([child]);
                return;
            }
        }

        recursionStack.delete(currentId);
        pathStack.pop();
    }

    dfs(startId);
    return foundCycle;
}


function buildCircularContext({
    severity,
    atomId,
    atomName,
    suggestedAction,
    suggestedAlternatives,
    extraData
}) {
    return createStandardContext({
        guardName: 'circular-guard',
        atomId,
        atomName,
        severity,
        suggestedAction,
        suggestedAlternatives,
        extraData
    });
}

function buildFileGraph(allFiles = []) {
    const fileGraph = new Map();

    for (const file of allFiles) {
        if (!file.imports_json) continue;

        try {
            const parsed = JSON.parse(file.imports_json);
            const targets = safeArray(parsed)
                .filter((entry) => entry && entry.type === 'local' && entry.resolved)
                .map((entry) => entry.resolved);
            fileGraph.set(file.path, targets);
        } catch {
            // Ignore malformed cached payloads in incremental mode.
        }
    }

    return fileGraph;
}

function buildCallGraph(relations = []) {
    const callGraph = new Map();

    for (const relation of relations) {
        if (!callGraph.has(relation.source_id)) {
            callGraph.set(relation.source_id, new Set());
        }
        callGraph.get(relation.source_id).add(relation.target_id);
    }

    return callGraph;
}

function mergeLocalCalls(callGraph, localAtoms = []) {
    for (const atom of localAtoms) {
        if (!atom.calls_json) continue;

        try {
            const parsed = JSON.parse(atom.calls_json);
            const resolvedCalls = safeArray(parsed)
                .filter((call) => call && call.resolved && call.targetId)
                .map((call) => call.targetId);

            if (resolvedCalls.length === 0) continue;

            if (!callGraph.has(atom.id)) {
                callGraph.set(atom.id, new Set());
            }
            const targets = callGraph.get(atom.id);
            for (const targetId of resolvedCalls) {
                targets.add(targetId);
            }
        } catch {
            // Ignore malformed incremental payloads.
        }
    }

    return callGraph;
}

function getCallGraphChildren(callGraph, atomId) {
    const targets = callGraph.get(atomId);
    return targets ? [...targets] : [];
}

async function persistModuleCycleIssue(rootPath, filePath, fileCycle) {
    const message = `Circular module dependency detected: ${fileCycle.join(' âž” ')}`;
    const context = buildCircularContext({
        severity: 'high',
        suggestedAction: 'Break the circular dependency by extracting shared code to a separate module',
        suggestedAlternatives: [
            'Extract common functionality to a third module',
            'Use dependency injection to break the cycle',
            'Consider if the modules have too many responsibilities'
        ],
        extraData: {
            cycleType: 'module',
            cyclePath: fileCycle,
            cycleLength: fileCycle.length
        }
    });

    logger.warn(`[CIRCULAR GUARD] ${message}`);
    await persistCircularIssue(rootPath, filePath, 'high', message, context);
}

async function persistLifecycleCycleIssue(rootPath, filePath, atom, atomCycle, atomNames) {
    const message = `Event-driven lifecycle loop detected: ${atomNames.join(' âž” ')}`;
    const context = buildCircularContext({
        severity: 'low',
        atomId: atom.id,
        atomName: atomNames[0],
        suggestedAction: 'Verify that the lifecycle loop is event-driven and guarded by restart/connection state checks.',
        suggestedAlternatives: [
            'Keep lifecycle loops behind event/timer boundaries',
            'Document why the control loop is intentional',
            'Avoid direct synchronous recursion inside runtime ownership code'
        ],
        extraData: {
            cycleType: 'lifecycle',
            cyclePath: atomCycle,
            cycleLength: atomCycle.length,
            atomNames
        }
    });

    logger.info(`[CIRCULAR FUNCTION GUARD][LIFECYCLE] ${message}`);
    await persistCircularIssue(rootPath, filePath, 'low', message, context);
    await clearCircularIssues(rootPath, filePath);
    return context;
}

async function persistFunctionalCycleIssue(rootPath, filePath, atom, atomCycle, atomNames) {
    const message = `Cross-file functional recursion detected: ${atomNames.join(' âž” ')}`;
    const context = buildCircularContext({
        severity: 'high',
        atomId: atom.id,
        atomName: atomNames[0],
        suggestedAction: 'Review the call chain for potential infinite recursion. Consider using iteration or adding base case guards.',
        suggestedAlternatives: [
            'Convert recursive calls to iterative loops',
            'Add termination condition checks',
            'Use memoization to prevent repeated calls',
            'Break the cycle by restructuring the logic'
        ],
        extraData: {
            cycleType: 'function',
            cyclePath: atomCycle,
            cycleLength: atomCycle.length,
            atomNames
        }
    });

    logger.warn(`[CIRCULAR FUNCTION GUARD] ${message}`);
    await persistCircularIssue(rootPath, filePath, 'high', message, context);
    return context;
}

async function detectAtomCycles(rootPath, filePath, relPath, repo, localAtoms, fileCycle) {
    try {
        const atomIdPattern = `${relPath}::%`;
        const relations = getCircularCallRelations(repo?.db, atomIdPattern);
        const callGraph = mergeLocalCalls(buildCallGraph(relations), localAtoms);

        for (const atom of localAtoms) {
            const atomCycle = findCycleDFS(atom.id, (id) => getCallGraphChildren(callGraph, id));
            if (!atomCycle || atomCycle.length <= 2) {
                continue;
            }

            const atomNames = atomCycle.map((atomId) => atomId.split('::')[1] || atomId);
            const cycleClassification = classifyCircularCycle(relPath, atomCycle, atomNames);

            if (cycleClassification === 'algorithmic') {
                logger.debug(`[CIRCULAR FUNCTION GUARD][ALGORITHMIC] Ignoring intentional recursion: ${atomNames.join(' âž” ')}`);
                await clearCircularIssues(rootPath, filePath);
                continue;
            }

            if (cycleClassification === 'lifecycle') {
                const context = await persistLifecycleCycleIssue(rootPath, filePath, atom, atomCycle, atomNames);
                return { fileCycle, atomCycle, context };
            }

            const context = await persistFunctionalCycleIssue(rootPath, filePath, atom, atomCycle, atomNames);
            return { fileCycle, atomCycle, context };
        }

        await clearCircularIssues(rootPath, filePath);
        return { fileCycle, atomCycle: null };
    } catch (error) {
        logger.debug(`[CIRCULAR FUNCTION GUARD][SKIP] ${relPath}: ${error.message}`);
        return { fileCycle, atomCycle: null };
    }
}

export async function detectCircularDependencies(rootPath, filePath, repo) {
    const relPath = normalizePath(path.relative(rootPath, filePath));

    if (!repo || !repo.db) {
        logger.debug(`[CIRCULAR GUARD SKIP] No DB connection for ${relPath}`);
        return null;
    }

    try {
        const allFiles = getCircularFileImports(repo.db);
        const fileGraph = buildFileGraph(allFiles);
        const fileCycle = findCycleDFS(relPath, (id) => fileGraph.get(id));

        if (fileCycle) {
            await persistModuleCycleIssue(rootPath, filePath, fileCycle);
        } else {
            await clearCircularIssues(rootPath, filePath);
        }

        const localAtoms = getCircularLocalAtoms(repo.db, relPath);

        if (localAtoms.length === 0) {
            return { fileCycle, atomCycle: null };
        }

        return detectAtomCycles(rootPath, filePath, relPath, repo, localAtoms, fileCycle);
    } catch (error) {
        logger.error(`[CIRCULAR GUARD FAILED] ${error.message}`);
        return null;
    }
}

export async function detectCircularImportsForFile(rootPath, filePath, EventEmitterContext, options = {}) {
    const { maxDepth = 5 } = options;

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return null;

        const startNode = filePath.replace(/\\/g, '/');
        const cyclesFound = [];
        const queue = [{ path: startNode, chain: [startNode] }];
        const visited = new Set();

        const getDeps = prepareFileDependencyLookup(repo.db);
        if (!getDeps) {
            return null;
        }

        let iterationCount = 0;
        while (queue.length > 0 && iterationCount < 1000) {
            iterationCount++;
            const { path: currentPath, chain } = queue.shift();

            if (chain.length > maxDepth) continue;

            const outgoing = getDeps.all(currentPath);
            for (const row of outgoing) {
                const nextPath = row.target_path;
                if (nextPath === startNode) {
                    cyclesFound.push([...chain, startNode]);
                    continue;
                }

                const visitKey = `${currentPath}->${nextPath}`;
                if (!visited.has(visitKey) && !chain.includes(nextPath)) {
                    visited.add(visitKey);
                    queue.push({ path: nextPath, chain: [...chain, nextPath] });
                }
            }
        }

        if (cyclesFound.length === 0) {
            await clearCircularIssues(rootPath, filePath);
            return [];
        }

        const shortestCycle = cyclesFound.sort((a, b) => a.length - b.length)[0];
        const cycleStr = shortestCycle.join(' -> ');
        logger.warn(`[CIRCULAR GUARD] Circular import detected: ${cycleStr}`);

        const context = buildCircularContext({
            severity: 'high',
            suggestedAction: 'Break the circular import by extracting shared code',
            suggestedAlternatives: [
                'Create a shared types/utils module',
                'Use dependency injection',
                'Merge tightly coupled modules'
            ],
            extraData: {
                cycleType: 'import',
                cycles: cyclesFound,
                shortestCycle,
                cycleLength: shortestCycle.length
            }
        });

        await persistCircularIssue(rootPath, filePath, 'high', `Circular dependency: ${cycleStr}`, context);

        EventEmitterContext.emit('arch:circular', { filePath, cycles: cyclesFound });
        return cyclesFound;
    } catch (error) {
        logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}

export default { detectCircularDependencies, detectCircularImportsForFile };
