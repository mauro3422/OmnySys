import path from 'path';
import { loadAtoms } from '#layer-c/storage/index.js';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { extractExportsFromCode } from './exports.js';
import { query_graph } from '../query-graph.js';
import { reindexFile } from './reindex.js';
import { validatePostEditOptimized } from './validators.js';

function isLowSignalExportName(name = '') {
    return name.length < 3 || /^[a-z]$/.test(name);
}

export async function loadPreviousAtoms(projectPath, filePath) {
    try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        const relativePath = path.relative(projectPath, absolutePath);
        return await loadAtoms(projectPath, relativePath);
    } catch {
        return [];
    }
}

export async function collectCrossFileDuplicates(newString, filePath, context, logger) {
    const newExports = extractExportsFromCode(newString);
    const duplicates = [];

    for (const exportItem of newExports) {
        if (isLowSignalExportName(exportItem.name)) {
            continue;
        }

        try {
            const existing = await query_graph(
                { queryType: 'instances', symbolName: exportItem.name },
                context
            );

            if (!existing?.success || existing?.data?.totalInstances <= 0) {
                continue;
            }

            const otherFiles = existing.data.instances.filter(
                (instance) => !instance.file_path.endsWith(filePath)
            );

            if (otherFiles.length === 0) {
                continue;
            }

            duplicates.push({
                symbol: exportItem.name,
                type: exportItem.type,
                existingInstances: otherFiles.length,
                existingFiles: otherFiles.map((item) => item.file_path),
                existingLocations: otherFiles.map((item) => ({
                    file: item.file_path,
                    line: item.line_start
                }))
            });
        } catch (error) {
            logger.debug(`[CrossFileGuard] Skip ${exportItem.name}: ${error.message}`);
        }
    }

    return duplicates;
}

export function buildCrossFileDuplicateWarnings(crossFileDuplicates = []) {
    if (crossFileDuplicates.length === 0) {
        return [];
    }

    return [
        `[CrossFileDuplicateGuard] ${crossFileDuplicates.length} symbol(s) exist in other files: ${crossFileDuplicates.map((item) => item.symbol).join(', ')}`
    ];
}

export function createAtomicEditMutation(orchestrator, projectPath, filePath, oldString, newString, symbolName) {
    return async () => {
        const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
        const editResult = await atomicEditor.edit(filePath, oldString, newString, { symbolName });
        if (!editResult.success) {
            return {
                success: false,
                message: editResult.error,
                help: editResult.help,
                suggestions: editResult.help?.suggestions,
                filePreview: editResult.help?.filePreview
            };
        }

        return { success: true, baseEditResult: editResult, atomicEditor };
    };
}

export function createAtomicEditValidator({ filePath, projectPath, previousAtoms, autoFix, logger }) {
    return async (mutationResult) => {
        const { atomicEditor } = mutationResult;
        const reindexResult = await reindexFile(filePath, projectPath);
        if (!reindexResult.success) {
            return { valid: false, message: reindexResult.error };
        }

        const postValidation = await validatePostEditOptimized(
            filePath,
            projectPath,
            previousAtoms,
            reindexResult.atoms
        );

        if (postValidation.valid) {
            return { valid: true, analysisContext: { reindexResult } };
        }

        if (!autoFix || postValidation.brokenCallers.length === 0) {
            return {
                valid: false,
                brokenCallers: postValidation.brokenCallers,
                affectedFiles: postValidation.affectedFiles
            };
        }

        logger.warn(`[AutoFix] Cascade repair for ${postValidation.brokenCallers.length} broken callers`);
        try {
            for (const fix of postValidation.brokenCallers) {
                await atomicEditor.edit(fix.file, fix.oldCode, fix.newCode, { skipValidation: false });
            }

            const finalReindex = await reindexFile(filePath, projectPath);
            return {
                valid: true,
                analysisContext: {
                    reindexResult: finalReindex,
                    autoFixed: true,
                    autoFixedFiles: postValidation.brokenCallers.length
                }
            };
        } catch (autoFixErr) {
            return { valid: false, message: `Auto-fix cascade failed: ${autoFixErr.message}` };
        }
    };
}

export function buildAtomicEditWarnings(preValidation) {
    const warnings = [...(preValidation.exportConflicts.warnings || [])];
    warnings.push(...buildCrossFileDuplicateWarnings(preValidation.crossFileDuplicates || []));
    return warnings;
}

export function buildAtomicEditChanges(impact) {
    return impact.dependencyTree.map((tree) => ({
        function: tree.name,
        changes: tree.changes,
        dependentsCount: tree.dependents.length
    }));
}
