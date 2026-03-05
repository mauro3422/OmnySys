import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { normalizePath } from '#shared/utils/path-utils.js';

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

/**
 * Guard on-save principal que verifica tanto ciclos de imports como de llamados (atoms).
 */
export async function detectCircularDependencies(rootPath, filePath, repo) {
    const relPath = normalizePath(path.relative(rootPath, filePath));

    if (!repo || !repo.db) {
        logger.debug(`[CIRCULAR GUARD SKIP] No DB connection for ${relPath}`);
        return null;
    }

    try {
        // ============================================
        // 1. Detección de Ciclos Estructurales (Imports)
        // ============================================
        // Leemos eficientemente el mapa de todos los imports del proyecto
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
            const msg = `Module Circular Dependency detected: ${fileCycle.join(' ➔ ')}`;
            logger.warn(`[CIRCULAR GUARD] ${msg}`);

            await persistWatcherIssue(
                rootPath,
                filePath,
                'watcher_circular_dependency',
                'critical',
                msg,
                { cycleType: 'module', cyclePath: fileCycle }
            );
        } else {
            await clearWatcherIssue(rootPath, filePath, 'watcher_circular_dependency');
        }

        // ============================================
        // 2. Detección de Ciclos Lógicos (Llamadas de Átomos - Recursividad Infinita)
        // ============================================
        // Solo levantamos los átomos del archivo actual que fue guardado para ver si inician un ciclo
        const localAtoms = repo.db.prepare(`
      SELECT id, calls_json 
      FROM atoms 
      WHERE file_path = ?
    `).all(relPath);

        if (localAtoms.length > 0) {
            // Necesitamos cargar un mini-grafo de las llamadas que salen de estos átomos.
            // Para latencia ultra-baja (<5ms) traemos todos los calls en una sola query plana de ID -> ID
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

            // Además, añadimos los calls_json del archivo en memoria sin guardar por si son nuevitos
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

                    const msg = `Cross-file Functional Recursion detected: ${atomCycle.map(a => a.split('::')[1] || a).join(' ➔ ')}`;
                    logger.warn(`[CIRCULAR FUNCTION GUARD] ${msg}`);

                    await persistWatcherIssue(
                        rootPath,
                        filePath,
                        'watcher_circular_call',
                        'high',
                        msg,
                        { cycleType: 'function', cyclePath: atomCycle }
                    );

                    return { fileCycle, atomCycle }; // Salimos ante el primer átomo defectuoso
                }
            }

            await clearWatcherIssue(rootPath, filePath, 'watcher_circular_call');
        }

        return { fileCycle, atomCycle: null };

    } catch (err) {
        logger.error(`[CIRCULAR GUARD FAILED] ${err.message}`);
        return null;
    }
}

/**
 * Legacy circular import detector on-demand
 * Utiliza la tabla `file_dependencies` local en SQLite para un BFS de max_depth = 5.
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

            logger.warn(`[CIRCULAR GUARD] 🚨 Circular import detected involving ${filePath}: \n   ${cycleStr}`);

            await persistWatcherIssue(
                rootPath,
                filePath,
                'watcher_circular_import',
                'high',
                `Circular dependency detected: ${cycleStr}`,
                { cycles: cyclesFound }
            );

            EventEmitterContext.emit('circular:detected', { filePath, cycles: cyclesFound });
            return cyclesFound;
        } else {
            await clearWatcherIssue(rootPath, filePath, 'watcher_circular_import');
            return [];
        }
    } catch (error) {
        logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}
