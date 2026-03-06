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

        return { valid: true, exportConflicts, blastRadius, solidViolations };
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
            warnings: preValidation.exportConflicts.warnings.length > 0 ? preValidation.exportConflicts.warnings : undefined,
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
