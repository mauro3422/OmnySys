/**
 * @fileoverview Refactorización OOP de atomic_edit
 * Hereda de AtomicMutationTool para control transaccional estricto y AutoFix.
 */

import path from 'path';
import { AtomicMutationTool } from '#layer-c/mcp/core/shared/base-tools/atomic-mutation-tool.js';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { reindexFile } from './reindex.js';
import { loadAtoms } from '#layer-c/storage/index.js';
import { AnalysisEngine } from '../../core/shared/analysis-engine.js';
import { validateBeforeEdit } from '../../core/validation-utils.js';
import { validateImportsInEdit, validatePostEditOptimized } from './validators.js';
import {
    DATA_DIR,
    getDataPath
} from '#config/paths.js';
import { checkEditExportConflicts } from './exports.js';
import { analyzeFullImpact } from './analysis.js';
import { analyzeBlastRadius } from './graph-alerts.js';
import { normalizeAtomicPath } from './write-orchestrator.js';
import { summarizeAtomSemanticPurity } from '../../../../shared/compiler/index.js';
import { extractExportsFromCode } from './exports.js';
import { query_graph } from '../query-graph.js';

export class AtomicEditorTool extends AtomicMutationTool {
    constructor() {
        super('atomic:edit');
    }

    validateEditArgs(args) {
        const { filePath, oldString, newString, symbolName } = args;

        if (!this.projectPath) {
            return this.formatError('MISSING_PROJECT_PATH', 'projectPath not provided in context');
        }

        if (!filePath || (!oldString && !symbolName) || newString === undefined) {
            return this.formatError('INVALID_PARAMS', 'Missing required parameters: filePath, newString, and (oldString OR symbolName)');
        }

        return null;
    }

    async performPreEditValidation(filePath, oldString, newString, symbolName) {
        // 1. Validación base de estado
        const validation = await validateBeforeEdit({ filePath, symbolName: symbolName || null, projectPath: this.projectPath });
        if (!validation.valid) {
            return this.formatError('VALIDATION_FAILED', 'Pre-edit validation failed', { errors: validation.errors });
        }

        // 2. Blast Radius & SOLID Detection
        const blastRadius = await analyzeBlastRadius(filePath, this.projectPath, symbolName);
        const atoms = (await loadAtoms(this.projectPath, filePath)) || [];
        const healthAudit = await AnalysisEngine.auditHealth(filePath, this.projectPath, atoms);
        const solidViolations = healthAudit.violations;

        // 3. Validación de importaciones rotas
        const brokenImports = await validateImportsInEdit(filePath, newString, this.projectPath);
        if (brokenImports.length > 0) {
            return this.formatError('BROKEN_IMPORTS', `Found ${brokenImports.length} broken imports`, { brokenImports });
        }

        // 4. Conflictos de exports
        const exportConflicts = await checkEditExportConflicts(oldString, newString, filePath, this.projectPath);
        if (exportConflicts.globalConflicts.some(c => c.isCritical)) {
            return this.formatError('EXPORT_DUPLICATE_CONFLICT', 'Critical export conflict detected', {
                conflicts: exportConflicts.globalConflicts.filter(c => c.isCritical)
            });
        }

        // 5. DUPLICATE GUARD CROSS-FILE (NUEVO - FASE 17)
        // Valida que los nuevos símbolos NO existan en OTROS archivos
        const newExports = extractExportsFromCode(newString);
        if (newExports.length > 0) {
            const crossFileDuplicates = [];

            for (const exportItem of newExports) {
                // Skip low-signal names
                if (exportItem.name.length < 3 || /^[a-z]$/.test(exportItem.name)) {
                    continue;
                }

                try {
                    const existing = await query_graph(
                        { queryType: 'instances', symbolName: exportItem.name },
                        this.context
                    );

                    if (existing?.success && existing?.data?.totalInstances > 0) {
                        // Filtrar el mismo archivo
                        const otherFiles = existing.data.instances.filter(
                            inst => !inst.file_path.endsWith(filePath)
                        );

                        if (otherFiles.length > 0) {
                            crossFileDuplicates.push({
                                symbol: exportItem.name,
                                type: exportItem.type,
                                existingInstances: otherFiles.length,
                                existingFiles: otherFiles.map(f => f.file_path),
                                existingLocations: otherFiles.map(f => ({
                                    file: f.file_path,
                                    line: f.line_start
                                }))
                            });
                        }
                    }
                } catch (error) {
                    this.logger.debug(`[CrossFileGuard] Skip ${exportItem.name}: ${error.message}`);
                }
            }

            if (crossFileDuplicates.length > 0 && autoFix) {
                // Con autoFix, solo warn
                this.logger.warn(
                    `[CrossFileDuplicateGuard] ${crossFileDuplicates.length} symbol(s) exist in other files: ${crossFileDuplicates.map(d => d.symbol).join(', ')}`
                );
            } else if (crossFileDuplicates.length > 0) {
                // Sin autoFix, retornamos warning en la respuesta
                exportConflicts.warnings.push(
                    `${crossFileDuplicates.length} symbol(s) already exist in other file(s): ${crossFileDuplicates.map(d => d.symbol).join(', ')}`
                );
            }
        }

        return { valid: true, exportConflicts, blastRadius, solidViolations, crossFileDuplicates };
    }

    async performAction(args) {
        const argError = this.validateEditArgs(args);
        if (argError) return { ...argError, file: args.filePath, severity: 'critical' };

        let { filePath, oldString, newString, symbolName, autoFix = false } = args;
        const { orchestrator } = this.context;

        if (path.isAbsolute(filePath)) {
            filePath = normalizeAtomicPath(filePath, this.projectPath);
        }

        // Estado previo
        let previousAtoms = [];
        try {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.projectPath, filePath);
            const relativePath = path.relative(this.projectPath, absolutePath);
            previousAtoms = await loadAtoms(this.projectPath, relativePath);
        } catch (e) { }

        const preValidation = await this.performPreEditValidation(filePath, oldString, newString, symbolName);
        if (preValidation.error) return { ...preValidation, file: filePath, severity: 'critical', canProceed: false };

        // ==========================================================
        // EJECUCIÓN TRANSACCIONAL
        // ==========================================================
        const mutationLogic = async (txId) => {
            const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(this.projectPath, orchestrator);
            const editResult = await atomicEditor.edit(filePath, oldString, newString, { symbolName });
            if (!editResult.success) {
                // Propagar información de ayuda si está disponible
                return { 
                    success: false, 
                    message: editResult.error,
                    help: editResult.help,
                    suggestions: editResult.help?.suggestions,
                    filePreview: editResult.help?.filePreview
                };
            }

            // Como `atomic_edit` tiene su propio wrapper interno, se acopla sutilmente:
            // Inyectamos validación y autofix dentro de la transacción padre.
            return { success: true, baseEditResult: editResult, atomicEditor };
        };

        const customValidator = async (mutationResult) => {
            const { atomicEditor } = mutationResult;
            const reindexResult = await reindexFile(filePath, this.projectPath);
            if (!reindexResult.success) {
                return { valid: false, message: reindexResult.error };
            }

            const postValidation = await validatePostEditOptimized(filePath, this.projectPath, previousAtoms, reindexResult.atoms);
            if (!postValidation.valid) {
                if (autoFix && postValidation.brokenCallers.length > 0) {
                    this.logger.warn(`[AutoFix] Cascade repair for ${postValidation.brokenCallers.length} broken callers`);
                    try {
                        for (const fix of postValidation.brokenCallers) {
                            await atomicEditor.edit(fix.file, fix.oldCode, fix.newCode, { skipValidation: false });
                        }
                        const finalReindex = await reindexFile(filePath, this.projectPath);
                        return { valid: true, analysisContext: { reindexResult: finalReindex, autoFixed: true, autoFixedFiles: postValidation.brokenCallers.length } };
                    } catch (autoFixErr) {
                        return { valid: false, message: `Auto-fix cascade failed: ${autoFixErr.message}` };
                    }
                }
                return { valid: false, brokenCallers: postValidation.brokenCallers, affectedFiles: postValidation.affectedFiles };
            }
            return { valid: true, analysisContext: { reindexResult } };
        };

        const txResult = await this.runInTransaction(args, mutationLogic, customValidator);

        // Rollback o AutoFix Delegation (POST_VALIDATION_WITH_AUTOFIX interceptado)
        if (!txResult.success) {
            if (txResult.error === 'POST_VALIDATION_FAILED' || txResult.error === 'POST_VALIDATION_WITH_AUTOFIX') {
                return {
                    ...txResult,
                    file: filePath,
                    suggestion: `Review 'brokenCallers' and re-run with 'autoFix: true' to apply them automatically.`,
                    rolledBack: true,
                    codeProposals: txResult.brokenCallers
                }
            }
            return { ...txResult, file: filePath, severity: 'critical' };
        }

        // Mapeo Final de Respuesta MCP
        const { reindexResult, autoFixed, autoFixedFiles } = txResult.analysisContext;
        const impact = await analyzeFullImpact(filePath, this.projectPath, previousAtoms, reindexResult.atoms);
        const semanticPurity = summarizeAtomSemanticPurity(reindexResult.atoms || []);

        // Construir warnings consolidados
        const allWarnings = [
            ...(preValidation.exportConflicts.warnings || []),
            ...(preValidation.crossFileDuplicates?.length > 0 
                ? [`[CrossFileDuplicateGuard] ${preValidation.crossFileDuplicates.length} symbol(s) exist in other files: ${preValidation.crossFileDuplicates.map(d => d.symbol).join(', ')}`]
                : [])
        ];

        return this.formatSuccess({
            file: filePath,
            impact: {
                level: impact.level,
                score: impact.score,
                classification: preValidation.blastRadius.classification,
                affectedFiles: impact.affectedFiles.size,
                reindexedAtoms: reindexResult.atoms?.length || 0
            },
            changes: impact.dependencyTree.map(tree => ({
                function: tree.name,
                changes: tree.changes,
                dependentsCount: tree.dependents.length
            })),
            autoFixed,
            autoFixedFiles,
            semanticPurity,
            warnings: allWarnings.length > 0 ? allWarnings : undefined,
            crossFileDuplicates: preValidation.crossFileDuplicates?.length > 0 ? preValidation.crossFileDuplicates : undefined,
            blastRadius: preValidation.blastRadius,
            solidViolations: Object.values(preValidation.solidViolations).some(v => v !== null) ? preValidation.solidViolations : undefined
        }, `Atomic edit successful${autoFixed ? ` (AutoFixed ${autoFixedFiles} callers)` : ''}`);
    }
}

// Wrapper para MCP
export const atomic_edit = async (args, context) => {
    const tool = new AtomicEditorTool();
    return tool.execute(args, context);
};
