import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getFileDependents } from '#layer-c/query/apis/file-api.js';
import { calculateRelativeImport, normalizeImportToAbsolute } from '../../../../utils/path-utils.js';
import { atomic_edit } from '../../tools/atomic-edit/index.js';
import { extractModuleDependencySourcesFromCode } from '../../tools/atomic-edit/exports.js';
import { reindexFile } from '../../tools/atomic-edit/reindex.js';
import { removePersistedAtomMetadata, removePersistedFileMetadata } from '../../../../shared/compiler/compiler-persistence.js';
import { withMutationBatch } from './mutation-batch.js';
import { settleMutationFiles } from './mutation-settlement.js';

const logger = createLogger('OmnySys:move:orchestrator');

function normalizeSnapshotPath(filePath = '') {
    return String(filePath || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\/+/, '');
}

function resolveDependentsFromSnapshot(oldPath, snapshot) {
    if (!snapshot) {
        return null;
    }

    const normalizedOldPath = normalizeSnapshotPath(oldPath);
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

function findModuleSourceLineIndex(code, moduleSource) {
    return code.split('\n').findIndex((line) => line.includes(`'${moduleSource}'`) || line.includes(`"${moduleSource}"`));
}

async function rewriteMovedFileReferences(oldPath, newPath, projectPath, context = {}) {
    const absNew = path.resolve(projectPath, newPath);
    let code = await fs.readFile(absNew, 'utf-8');
    const moduleSources = extractModuleDependencySourcesFromCode(code);
    const rewrites = [];

    for (const moduleSource of moduleSources) {
        if (!moduleSource.startsWith('.') && !moduleSource.startsWith('#')) {
            continue;
        }

        const resolvedTarget = normalizeImportToAbsolute(moduleSource, oldPath, projectPath);
        if (!resolvedTarget || resolvedTarget === moduleSource) {
            continue;
        }

        const newModuleSource = calculateRelativeImport(newPath, path.relative(projectPath, resolvedTarget), projectPath);
        if (!newModuleSource || newModuleSource === moduleSource) {
            continue;
        }

        const lineIndex = findModuleSourceLineIndex(code, moduleSource);
        if (lineIndex === -1) {
            continue;
        }

        const lines = code.split('\n');
        const oldLine = lines[lineIndex];
        const newLine = oldLine.replace(moduleSource, newModuleSource);
        if (newLine === oldLine) {
            continue;
        }

        const editRes = await atomic_edit({
            filePath: newPath,
            oldString: oldLine,
            newString: newLine
        }, { ...context, projectPath });

        if (editRes.success) {
            rewrites.push({
                filePath: newPath,
                from: moduleSource,
                to: newModuleSource
            });
            code = code.replace(oldLine, newLine);
        }
    }

    return rewrites;
}

export class MoveOrchestrator {
    /**
     * Mueve un archivo y actualiza todas sus referencias globales de forma atómica
     * @param {string} oldPath - Ruta actual relativa al proyecto
     * @param {string} newPath - Nueva ruta relativa al proyecto
     * @param {string} projectPath - Ruta raíz del proyecto
     * @param {Object} context - Contexto del orquestador MCP
     * @returns {Promise<Object>} Resultado de la operación
     */
    static async moveFile(oldPath, newPath, projectPath, context = {}) {
        logger.info(`[MoveOrchestrator] Starting move: ${oldPath} -> ${newPath}`);

        // Sincronización: Esperar a que el indexador en background termine de procesar archivos recientes
        const { orchestrator } = context;
        if (orchestrator) {
            logger.info(`[MoveOrchestrator] Sycnhronizing with background indexer...`);
            let attempts = 0;
            while (attempts < 50 && (orchestrator.queue?.size() > 0 || orchestrator.activeJobs > 0)) {
                await new Promise((r) => setTimeout(r, 200));
                attempts++;
            }
        }

        const snapshot = context.folderizationSnapshot || context.analysisSnapshot || null;
        const snapshotDependents = resolveDependentsFromSnapshot(oldPath, snapshot);

        // 1. Obtener dependientes ANTES del movimiento. Preferimos la snapshot del momento
        // para no depender de SQLite durante la mutación sensible.
        const dependents = Array.isArray(snapshotDependents)
            ? snapshotDependents
            : await getFileDependents(projectPath, oldPath);
        logger.info(`[MoveOrchestrator] Found ${dependents.length} dependent files to update`);

        const absOld = path.resolve(projectPath, oldPath);
        const absNew = path.resolve(projectPath, newPath);
        const mutationServer = context.server || context.orchestrator?.server || null;

        try {
            const moveResult = await withMutationBatch(mutationServer, {
                reason: 'move_file',
                files: [oldPath, newPath]
            }, async () => {
                // 2. Mover archivo físicamente
                await fs.mkdir(path.dirname(absNew), { recursive: true });
                await fs.rename(absOld, absNew);
                logger.info(`[MoveOrchestrator] Physical move successful`);

                const selfRewrites = await rewriteMovedFileReferences(oldPath, newPath, projectPath, context);

                await reindexFile(newPath, projectPath);

                await Promise.allSettled([
                    removePersistedFileMetadata(projectPath, oldPath),
                    removePersistedAtomMetadata(projectPath, oldPath)
                ]);

                const results = {
                    success: true,
                    moved: { from: oldPath, to: newPath },
                    selfUpdated: selfRewrites.length > 0,
                    selfRewrites,
                    updatedFiles: [],
                    failedUpdates: []
                };

                // 4. Actualizar cada dependiente
                for (const depPath of dependents) {
                    try {
                        const absDep = path.resolve(projectPath, depPath);
                        const code = await fs.readFile(absDep, 'utf-8');
                        const imports = extractModuleDependencySourcesFromCode(code);

                        // Identificar el import exacto que apunta al archivo movido
                        const matchingImport = imports.find((imp) => {
                            const absResolved = normalizeImportToAbsolute(imp, depPath, projectPath);
                            // Normalizamos para comparar sin importar extensión o slash final
                            const normTarget = absOld.replace(/\.[jt]sx?$/, '').replace(/\\/g, '/');
                            const normResolved = absResolved.replace(/\.[jt]sx?$/, '').replace(/\\/g, '/');
                            return normResolved === normTarget;
                        });

                        if (matchingImport) {
                            const newImportStr = calculateRelativeImport(depPath, newPath, projectPath);
                            logger.info(`[MoveOrchestrator] Updating ${depPath}: "${matchingImport}" -> "${newImportStr}"`);

                            // Localizar la línea exacta del import para el atomic_edit
                            const lines = code.split('\n');
                            const lineIndex = lines.findIndex((line) => line.includes(`'${matchingImport}'`) || line.includes(`"${matchingImport}"`));

                            if (lineIndex !== -1) {
                                const oldLine = lines[lineIndex];
                                const newLine = oldLine.replace(matchingImport, newImportStr);

                                // Aplicamos el cambio atómicamente
                                const editRes = await atomic_edit({
                                    filePath: depPath,
                                    oldString: oldLine,
                                    newString: newLine
                                }, { ...context, projectPath });

                                if (editRes.success) {
                                    results.updatedFiles.push(depPath);
                                } else {
                                    results.failedUpdates.push({ file: depPath, reason: editRes.message });
                                    logger.warn(`[MoveOrchestrator] Atomic edit failed for ${depPath}: ${editRes.message}`);
                                }
                            } else {
                                results.failedUpdates.push({ file: depPath, reason: 'Import line not found by string match' });
                            }
                        }
                    } catch (err) {
                        logger.error(`[MoveOrchestrator] Failed to process dependent ${depPath}: ${err.message}`);
                        results.failedUpdates.push({ file: depPath, reason: err.message });
                    }
                }

                return results;
            });

            if (!moveResult?.success) {
                return moveResult;
            }

            const settlement = await settleMutationFiles({
                projectPath,
                context,
                reason: 'move_file',
                touchedFiles: [oldPath, newPath, ...dependents, ...(moveResult.updatedFiles || [])],
                validationTargets: [newPath, ...(moveResult.updatedFiles || []), ...dependents],
                maxValidationTargets: 10
            });

            return {
                ...moveResult,
                settlement
            };
        } catch (err) {
            logger.error(`[MoveOrchestrator] Fatal move error: ${err.message}`);
            return {
                success: false,
                error: err.message,
                moved: false
            };
        }
    }
}

export default MoveOrchestrator;
