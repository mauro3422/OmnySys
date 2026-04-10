import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../../utils/logger.js';
import { calculateRelativeImport, normalizeImportToAbsolute } from '../../../../../utils/path-utils.js';
import { atomic_edit } from '../../../tools/atomic-edit/index.js';
import { extractModuleDependencySourcesFromCode } from '../../../tools/atomic-edit/exports.js';
import { removePersistedAtomMetadata, removePersistedFileMetadata } from '../../../../../shared/compiler/index.js';
import { withMutationBatch } from '../mutation-batch.js';
import { settleMutationFiles } from '../mutation-settlement.js';
import {
    collectMoveDependents,
    findMatchingMoveImport,
    findModuleSourceLineIndex,
    waitForBackgroundIndexer
} from './index.js';

const logger = createLogger('OmnySys:move:orchestrator');

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

async function updateDependentFile(depPath, oldPath, newPath, projectPath, context = {}) {
    const absDep = path.resolve(projectPath, depPath);
    const code = await fs.readFile(absDep, 'utf-8');
    const imports = extractModuleDependencySourcesFromCode(code);
    const matchingImport = findMatchingMoveImport(imports, depPath, oldPath, projectPath);

    if (!matchingImport) {
        return {
            file: depPath,
            updated: false,
            reason: 'matching_import_not_found'
        };
    }

    const newImportStr = calculateRelativeImport(depPath, newPath, projectPath);
    logger.info(`[MoveOrchestrator] Updating ${depPath}: "${matchingImport}" -> "${newImportStr}"`);

    const lineIndex = findModuleSourceLineIndex(code, matchingImport);
    if (lineIndex === -1) {
        return {
            file: depPath,
            updated: false,
            reason: 'import_line_not_found'
        };
    }

    const lines = code.split('\n');
    const oldLine = lines[lineIndex];
    const newLine = oldLine.replace(matchingImport, newImportStr);
    if (newLine === oldLine) {
        return {
            file: depPath,
            updated: false,
            reason: 'import_unchanged'
        };
    }

    const editRes = await atomic_edit({
        filePath: depPath,
        oldString: oldLine,
        newString: newLine
    }, { ...context, projectPath });

    if (!editRes.success) {
        return {
            file: depPath,
            updated: false,
            reason: editRes.message || 'atomic_edit_failed'
        };
    }

    return {
        file: depPath,
        updated: true
    };
}

async function updateMoveDependents(dependents, oldPath, newPath, projectPath, context = {}) {
    const updatedFiles = [];
    const failedUpdates = [];

    for (const depPath of dependents) {
        try {
            const update = await updateDependentFile(depPath, oldPath, newPath, projectPath, context);
            if (update.updated) {
                updatedFiles.push(depPath);
            } else if (update.reason !== 'matching_import_not_found') {
                failedUpdates.push({ file: depPath, reason: update.reason || 'update_failed' });
            }
        } catch (err) {
            logger.error(`[MoveOrchestrator] Failed to process dependent ${depPath}: ${err.message}`);
            failedUpdates.push({ file: depPath, reason: err.message });
        }
    }

    return {
        updatedFiles,
        failedUpdates
    };
}

/**
 * Detecta barrel files que re-exportan el archivo movido y los actualiza.
 * Un barrel file es un archivo donde ≥50% de sus exports son re-exports.
 * Actualiza los re-exports para apuntar al nuevo path.
 */
async function detectAndUpdateBarrelFiles(oldPath, newPath, projectPath, context = {}) {
    const barrelUpdates = [];
    const { server, projectPath: _pp, ...restContext } = context || {};
    const orchestrator = context?.orchestrator || server;
    const repo = orchestrator?.cache?.getRepository?.() || null;

    if (!repo?.db) {
        return barrelUpdates;
    }

    // Buscar archivos que importan/re-exportan el oldPath
    const importers = repo.db.prepare(`
        SELECT DISTINCT f.path
        FROM files f, json_each(f.imports_json) as imp
        WHERE f.is_removed = 0
        AND imp.value LIKE ?
    `).all(`%${oldPath.replace(/\\/g, '/').split('/').pop()}%`);

    for (const row of importers) {
        const filePath = row.path;
        if (filePath === oldPath || filePath === newPath) continue;

        const absPath = path.resolve(projectPath, filePath);
        try {
            const code = await fs.readFile(absPath, 'utf-8');
            const lines = code.split('\n');

            // Detectar re-exports: export { x } from '...' o export * from '...'
            const reExportPattern = new RegExp(
                `export\\s+(\\{[^}]*\\}|\\*)\\s+from\\s+['"]([^'"]*(?:${oldPath.replace(/\\/g, '/').split('/').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}))['"]`,
                'g'
            );

            let fileModified = false;
            for (let i = 0; i < lines.length; i++) {
                const match = reExportPattern.exec(lines[i]);
                if (match) {
                    const oldImportPath = match[2];
                    const newImportPath = calculateRelativeImport(filePath, newPath, projectPath);

                    if (newImportPath && newImportPath !== oldImportPath) {
                        const oldLine = lines[i];
                        const newLine = oldLine.replace(oldImportPath, newImportPath);
                        lines[i] = newLine;
                        fileModified = true;

                        barrelUpdates.push({
                            filePath,
                            from: oldImportPath,
                            to: newImportPath
                        });
                    }
                }
            }

            if (fileModified) {
                const newCode = lines.join('\n');
                await fs.writeFile(absPath, newCode, 'utf-8');
                logger.info(`[MoveOrchestrator] Barrel file updated: ${filePath}`);
            }
        } catch (err) {
            logger.warn(`[MoveOrchestrator] Failed to check barrel file ${filePath}: ${err.message}`);
        }
    }

    return barrelUpdates;
}

async function executeMoveMutation(oldPath, newPath, projectPath, context, dependents) {
    const absOld = path.resolve(projectPath, oldPath);
    const absNew = path.resolve(projectPath, newPath);
    const mutationServer = context.server || context.orchestrator?.server || null;
    // When skipSelfRewrite is true, defer import rewriting to the caller
    // (e.g., folderize-family-import-rewriter) which has the complete picture
    // of all moves and renames in the batch.
    const skipSelfRewrite = context?.skipSelfRewrite === true;

    return await withMutationBatch(mutationServer, {
        reason: 'move_file',
        files: [oldPath, newPath]
    }, async () => {
        await fs.mkdir(path.dirname(absNew), { recursive: true });
        await fs.rename(absOld, absNew);
        logger.info('[MoveOrchestrator] Physical move successful');

        const selfRewrites = skipSelfRewrite
            ? []
            : await rewriteMovedFileReferences(oldPath, newPath, projectPath, context);

        await Promise.allSettled([
            removePersistedFileMetadata(projectPath, oldPath),
            removePersistedAtomMetadata(projectPath, oldPath)
        ]);

        const dependencyUpdates = await updateMoveDependents(dependents, oldPath, newPath, projectPath, context);

        // Detectar y actualizar barrel files que re-exportan el archivo movido
        const barrelUpdates = await detectAndUpdateBarrelFiles(oldPath, newPath, projectPath, context);

        return {
            success: true,
            moved: { from: oldPath, to: newPath },
            selfUpdated: selfRewrites.length > 0,
            selfRewrites,
            updatedFiles: [...dependencyUpdates.updatedFiles, ...barrelUpdates.map(b => b.filePath)],
            barrelUpdates,
            failedUpdates: dependencyUpdates.failedUpdates
        };
    });
}

async function settleMoveMutation(projectPath, context, oldPath, newPath, dependents, moveResult) {
    const barrelFiles = (moveResult.barrelUpdates || []).map(b => b.filePath);
    return await settleMutationFiles({
        projectPath,
        context,
        reason: 'move_file',
        touchedFiles: [oldPath, newPath, ...dependents, ...(moveResult.updatedFiles || []), ...barrelFiles],
        validationTargets: [newPath, ...(moveResult.updatedFiles || []), ...dependents, ...barrelFiles],
        reindexTargets: [newPath, ...(moveResult.updatedFiles || []), ...barrelFiles],
        maxValidationTargets: 10
    });
}

export class MoveOrchestrator {
    /**
     * Move a file and update dependent imports atomically.
     * @param {string} oldPath - Current path relative to the project
     * @param {string} newPath - New path relative to the project
     * @param {string} projectPath - Project root path
     * @param {Object} context - MCP orchestrator context
     * @returns {Promise<Object>} Operation result
     */
    static async moveFile(oldPath, newPath, projectPath, context = {}) {
        logger.info(`[MoveOrchestrator] Starting move: ${oldPath} -> ${newPath}`);
        await waitForBackgroundIndexer(context.orchestrator);

        const snapshot = context.folderizationSnapshot || context.analysisSnapshot || null;
        const dependents = await collectMoveDependents(oldPath, projectPath, snapshot);
        logger.info(`[MoveOrchestrator] Found ${dependents.length} dependent files to update`);

        try {
            const moveResult = await executeMoveMutation(oldPath, newPath, projectPath, context, dependents);
            if (!moveResult?.success) {
                return moveResult;
            }

            // Skip settlement for batch operations (e.g., folderize_family)
            if (context?.skipSettlement) {
                logger.info(`[MoveOrchestrator] Skipping settlement (batch mode): ${oldPath} -> ${newPath}`);
                return {
                    ...moveResult,
                    settlement: null,
                    skippedSettlement: true
                };
            }

            const settlement = await settleMoveMutation(projectPath, context, oldPath, newPath, dependents, moveResult);

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
