import path from 'path';
import { loadAtoms } from '#layer-c/storage/index.js';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { extractExportsFromCode } from './exports.js';
import {
    findCrossFileDuplicateExports,
} from './cross-file-duplicate-helpers.js';
import { reindexFile } from './reindex.js';
import { validatePostEditOptimized } from './validators.js';

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
    return findCrossFileDuplicateExports(newExports, filePath, context, logger);
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
