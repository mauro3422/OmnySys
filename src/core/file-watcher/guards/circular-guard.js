/**
 * @fileoverview circular-guard.js
 *
 * Detecta ciclos de dependencias circulares (imports y llamadas de funciones).
 * Previene acoplamiento circular y recursión infinita.
 *
 * @module core/file-watcher/guards/circular-guard
 * @version 2.0.0 - Estandarizado
 */

import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { persistWatcherIssue, clearWatcherIssue, clearWatcherIssueFamily } from '../watcher-issue-persistence.js';
import { normalizePath } from '#shared/utils/path-utils.js';
import { classifyCircularCycle } from '../../../shared/compiler/index.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:circular');

/**
 * Navega el grafo en profundidad (DFS) para encontrar ciclos de dependencias
 * de longitud al menos 2. Se detiene al primer ciclo encontrado para latencia On-Save ~1ms.
 */
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
                // Ciclo detectado
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

function isRuntimeLifecycleFile(filePath = '') {
    const normalized = normalizePath(filePath);
    return normalized.endsWith('/mcp-http-proxy.js')
        || normalized.endsWith('/mcp-stdio-bridge.js');
}

function isEventDrivenLifecycleCycle(filePath, atomCycle = [], atomNames = []) {
    if (!isRuntimeLifecycleFile(filePath) || atomCycle.length < 3) {
        return false;
    }

    const normalizedCycleFiles = new Set(
        atomCycle
            .map((atomId) => String(atomId || '').split('::')[0])
            .filter(Boolean)
    );

    if (normalizedCycleFiles.size !== 1) {
        return false;
    }

    const lifecycleNamePattern = /schedule|spawn|restart|reconnect|recover|wait|connect|disconnect|shutdown|start|stop|close/i;
    const lifecycleHits = atomNames.filter((name) => lifecycleNamePattern.test(String(name || ''))).length;

    return lifecycleHits >= Math.max(2, atomNames.length - 1);
}

function isIntentionalAlgorithmicRecursion(atomCycle = [], atomNames = []) {
    if (atomCycle.length < 3) {
        return false;
    }

    const normalizedCycleFiles = new Set(
        atomCycle
            .map((atomId) => String(atomId || '').split('::')[0])
            .filter(Boolean)
    );

    if (normalizedCycleFiles.size !== 1) {
        return false;
    }

    const algorithmicNames = /^(dfs|bfs|walk|visit|traverse|findCycleDFS|scan|search)$/i;
    const matches = atomNames.filter((name) => algorithmicNames.test(String(name || ''))).length;
    return matches >= Math.max(2, atomNames.length - 1);
}

/**
 * Detecta dependencias circulares en módulos y llamadas de átomos
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} repo - Repositorio de datos
 * @returns {Promise<Object|null>} Resultado del análisis
 */
export async function detectCircularDependencies(rootPath, filePath, repo) {
    const relPath = normalizePath(path.relative(rootPath, filePath));

    if (!repo || !repo.db) {
        logger.debug(`[CIRCULAR GUARD SKIP] No DB connection for ${relPath}`);
        return null;
    }

    try {
        const clearCircularFamily = async () => {
            await clearWatcherIssueFamily(rootPath, filePath, 'arch_circular');
        };

        // ============================================
        // 1. Detección de Ciclos Estructurales (Imports)
        // ============================================
        const allFiles = repo.db.prepare('SELECT path, imports_json FROM files').all();

        function safeArray(val) {
            return Array.isArray(val) ? val : [];
        }

        // Armamos Adjacency List
        const fileGraph = new Map();
        for (const f of allFiles) {
            if (!f.imports_json) continue;
            try {
                const parsed = JSON.parse(f.imports_json);
                const targets = safeArray(parsed).filter(i => i && i.type === 'local' && i.resolved).map(i => i.resolved);
                fileGraph.set(f.path, targets);
            } catch (e) { /* ignore parse error */ }
        }

        const fileCycle = findCycleDFS(relPath, (id) => fileGraph.get(id));

        if (fileCycle) {
            const cycleStr = fileCycle.join(' ➔ ');
            const msg = `Circular module dependency detected: ${cycleStr}`;
            logger.warn(`[CIRCULAR GUARD] ${msg}`);

            // Crear contexto estandarizado
            const context = createStandardContext({
                guardName: 'circular-guard',
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

            const issueType = createIssueType(IssueDomains.ARCH, 'circular', 'high');
            await persistWatcherIssue(
                rootPath,
                filePath,
                issueType,
                'high',
                msg,
                context
            );

            await clearWatcherIssue(rootPath, filePath, 'arch_circular_call_high');
        } else {
            await clearCircularFamily();
            await clearWatcherIssue(rootPath, filePath, 'arch_circular_import_high');
        }

        // ============================================
        // 2. Detección de Ciclos Lógicos (Llamadas de Átomos)
        // ============================================
        const localAtoms = repo.db.prepare(`
            SELECT id, calls_json 
            FROM atoms 
            WHERE file_path = ?
        `).all(relPath);

        if (localAtoms.length > 0) {
            const relations = repo.db.prepare(`
                SELECT source_id, target_id 
                FROM atom_relations 
                WHERE relation_type = 'calls'
            `).all();

            const callGraph = new Map();
            for (const rel of relations) {
                if (!callGraph.has(rel.source_id)) callGraph.set(rel.source_id, []);
                callGraph.get(rel.source_id).push(rel.target_id);
            }

            // Añadir calls_json del archivo en memoria
            for (const atom of localAtoms) {
                if (!atom.calls_json) continue;
                try {
                    const parsed = JSON.parse(atom.calls_json);
                    const resolvedCalls = safeArray(parsed).filter(c => c && c.resolved && c.targetId).map(c => c.targetId);
                    if (resolvedCalls.length > 0) {
                        if (!callGraph.has(atom.id)) callGraph.set(atom.id, []);
                        callGraph.get(atom.id).push(...resolvedCalls);
                    }
                } catch (e) { /* ignore parse error */ }
            }

            // Verificamos ciclo funcional
            for (const atom of localAtoms) {
                const atomCycle = findCycleDFS(atom.id, (id) => callGraph.get(id));
                if (atomCycle) {
                    // Si el ciclo es consigo mismo [A, A] es recursión directa (suele ser intencional)
                    if (atomCycle.length <= 2) continue;

                    const atomNames = atomCycle.map(a => a.split('::')[1] || a);
                    const cycleClassification = classifyCircularCycle(relPath, atomCycle, atomNames);

                    if (cycleClassification === 'algorithmic') {
                        logger.debug(`[CIRCULAR FUNCTION GUARD][ALGORITHMIC] Ignoring intentional recursion: ${atomNames.join(' ➔ ')}`);
                        await clearCircularFamily();
                        continue;
                    }

                    if (cycleClassification === 'lifecycle') {
                        const cycleStr = atomNames.join(' ➔ ');
                        const msg = `Event-driven lifecycle loop detected: ${cycleStr}`;

                        logger.info(`[CIRCULAR FUNCTION GUARD][LIFECYCLE] ${msg}`);

                        const context = createStandardContext({
                            guardName: 'circular-guard',
                            atomId: atom.id,
                            atomName: atomNames[0],
                            severity: 'low',
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

                        const issueType = createIssueType(IssueDomains.ARCH, 'circular', 'low');
                        await persistWatcherIssue(
                            rootPath,
                            filePath,
                            issueType,
                            'low',
                            msg,
                            context
                        );

                        await clearCircularFamily();
                        return { fileCycle, atomCycle, context };
                    }

                    const cycleStr = atomNames.join(' ➔ ');
                    const msg = `Cross-file functional recursion detected: ${cycleStr}`;
                    
                    logger.warn(`[CIRCULAR FUNCTION GUARD] ${msg}`);

                    // Crear contexto estandarizado
                    const context = createStandardContext({
                        guardName: 'circular-guard',
                        atomId: atom.id,
                        atomName: atomNames[0],
                        severity: 'high',
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

                    const issueType = createIssueType(IssueDomains.ARCH, 'circular', 'high');
                    await persistWatcherIssue(
                        rootPath,
                        filePath,
                        issueType,
                        'high',
                        msg,
                        context
                    );

                    return { fileCycle, atomCycle, context };
                }
            }

            await clearCircularFamily();
            await clearWatcherIssue(rootPath, filePath, 'arch_circular_call_high');
        }

        return { fileCycle, atomCycle: null };

    } catch (err) {
        logger.error(`[CIRCULAR GUARD FAILED] ${err.message}`);
        return null;
    }
}

/**
 * Legacy circular import detector on-demand
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array|null>} Ciclos encontrados
 */
export async function detectCircularImportsForFile(rootPath, filePath, EventEmitterContext, options = {}) {
    const { maxDepth = 5 } = options;
    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) return null;

        const startNode = filePath.replace(/\\/g, '/');
        let cyclesFound = [];

        const queue = [{ path: startNode, chain: [startNode] }];
        const visited = new Set();

        let getDeps;
        try {
            getDeps = repo.db.prepare(`
                SELECT DISTINCT target_path 
                FROM file_dependencies 
                WHERE source_path = ?
            `);
        } catch (e) {
            return null;
        }

        let iter = 0;
        while (queue.length > 0 && iter < 1000) {
            iter++;
            const { path: currentPath, chain } = queue.shift();

            if (chain.length > maxDepth) continue;

            const outgoing = getDeps.all(currentPath);
            for (const row of outgoing) {
                const nextPath = row.target_path;
                if (nextPath === startNode) {
                    const cycle = [...chain, startNode];
                    cyclesFound.push(cycle);
                    continue;
                }

                const visitKey = `${currentPath}->${nextPath}`;
                if (!visited.has(visitKey) && !chain.includes(nextPath)) {
                    visited.add(visitKey);
                    queue.push({ path: nextPath, chain: [...chain, nextPath] });
                }
            }
        }

        if (cyclesFound.length > 0) {
            const shortestCycle = cyclesFound.sort((a, b) => a.length - b.length)[0];
            const cycleStr = shortestCycle.join(' -> ');

            logger.warn(`[CIRCULAR GUARD] Circular import detected: ${cycleStr}`);

            // Crear contexto estandarizado
            const context = createStandardContext({
                guardName: 'circular-guard',
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

            const issueType = createIssueType(IssueDomains.ARCH, 'circular', 'high');
            await persistWatcherIssue(
                rootPath,
                filePath,
                issueType,
                'high',
                `Circular dependency: ${cycleStr}`,
                context
            );

            EventEmitterContext.emit('arch:circular', { filePath, cycles: cyclesFound });
            return cyclesFound;
        } else {
            await clearWatcherIssueFamily(rootPath, filePath, 'arch_circular');
            await clearWatcherIssue(rootPath, filePath, 'arch_circular_import_high');
            return [];
        }
    } catch (error) {
        logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}

export default { detectCircularDependencies, detectCircularImportsForFile };
