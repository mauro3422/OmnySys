/**
 * @fileoverview Refactorizacion OOP de atomic_edit
 * Hereda de AtomicMutationTool para control transaccional estricto y AutoFix.
 */

import path from 'path';
import { AtomicMutationTool } from '#layer-c/mcp/core/shared/base-tools/atomic-mutation-tool.js';
import { loadAtoms } from '#layer-c/storage/index.js';
import { AnalysisEngine } from '../../core/shared/analysis-engine.js';
import { validateBeforeEdit } from '../../core/validation-utils.js';
import { validateImportsInEdit } from './validators.js';
import {
    DATA_DIR,
    getDataPath
} from '#config/paths.js';
import { checkEditExportConflicts } from './exports.js';
import { analyzeFullImpact } from './analysis.js';
import { analyzeBlastRadius } from './graph-alerts.js';
import {
    buildAtomicEditChanges,
    buildAtomicEditWarnings,
    buildCrossFileDuplicateWarnings,
    collectCrossFileDuplicates,
    createAtomicEditMutation,
    createAtomicEditValidator,
    loadPreviousAtoms
} from './atomic-editor-helpers.js';
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

    async performPreEditValidation(filePath, oldString, newString, symbolName, autoFix = false) {
        const validation = await validateBeforeEdit({
            filePath,
            symbolName: symbolName || null,
            projectPath: this.projectPath
        });
        if (!validation.valid) {
            return this.formatError('VALIDATION_FAILED', 'Pre-edit validation failed', { errors: validation.errors });
        }

        const blastRadius = await analyzeBlastRadius(filePath, this.projectPath, symbolName);
        const atoms = (await loadAtoms(this.projectPath, filePath)) || [];
        const healthAudit = await AnalysisEngine.auditHealth(filePath, this.projectPath, atoms);
        const solidViolations = healthAudit.violations;

        const brokenImports = await validateImportsInEdit(filePath, newString, this.projectPath);
        if (brokenImports.length > 0) {
            return this.formatError('BROKEN_IMPORTS', `Found ${brokenImports.length} broken imports`, { brokenImports });
        }

        const exportConflicts = await checkEditExportConflicts(oldString, newString, filePath, this.projectPath);
        if (exportConflicts.globalConflicts.some((conflict) => conflict.isCritical)) {
            return this.formatError('EXPORT_DUPLICATE_CONFLICT', 'Critical export conflict detected', {
                conflicts: exportConflicts.globalConflicts.filter((conflict) => conflict.isCritical)
            });
        }

        const crossFileDuplicates = await collectCrossFileDuplicates(newString, filePath, this.context, this.logger);
        if (crossFileDuplicates.length > 0 && autoFix) {
            this.logger.warn(buildCrossFileDuplicateWarnings(crossFileDuplicates)[0]);
        } else if (crossFileDuplicates.length > 0) {
            exportConflicts.warnings.push(
                `${crossFileDuplicates.length} symbol(s) already exist in other file(s): ${crossFileDuplicates.map((item) => item.symbol).join(', ')}`
            );
        }

        return { valid: true, exportConflicts, blastRadius, solidViolations, crossFileDuplicates };
    }

    async performAction(args) {
        const argError = this.validateEditArgs(args);
        if (argError) {
            return { ...argError, file: args.filePath, severity: 'critical' };
        }

        let { filePath, oldString, newString, symbolName, autoFix = false } = args;
        const { orchestrator } = this.context;

        if (path.isAbsolute(filePath)) {
            filePath = normalizeAtomicPath(filePath, this.projectPath);
        }

        const previousAtoms = await loadPreviousAtoms(this.projectPath, filePath);
        const preValidation = await this.performPreEditValidation(filePath, oldString, newString, symbolName, autoFix);
        if (preValidation.error) {
            return { ...preValidation, file: filePath, severity: 'critical', canProceed: false };
        }

        const mutationLogic = createAtomicEditMutation(
            orchestrator,
            this.projectPath,
            filePath,
            oldString,
            newString,
            symbolName
        );
        const customValidator = createAtomicEditValidator({
            filePath,
            projectPath: this.projectPath,
            previousAtoms,
            autoFix,
            logger: this.logger
        });

        const txResult = await this.runInTransaction(args, mutationLogic, customValidator);
        if (!txResult.success) {
            if (txResult.error === 'POST_VALIDATION_FAILED' || txResult.error === 'POST_VALIDATION_WITH_AUTOFIX') {
                return {
                    ...txResult,
                    file: filePath,
                    suggestion: `Review 'brokenCallers' and re-run with 'autoFix: true' to apply them automatically.`,
                    rolledBack: true,
                    codeProposals: txResult.brokenCallers
                };
            }

            return { ...txResult, file: filePath, severity: 'critical' };
        }

        const { reindexResult, autoFixed, autoFixedFiles } = txResult.analysisContext;
        const impact = await analyzeFullImpact(filePath, this.projectPath, previousAtoms, reindexResult.atoms);
        const semanticPurity = summarizeAtomSemanticPurity(reindexResult.atoms || []);
        const allWarnings = buildAtomicEditWarnings(preValidation);

        return this.formatSuccess({
            file: filePath,
            impact: {
                level: impact.level,
                score: impact.score,
                classification: preValidation.blastRadius.classification,
                affectedFiles: impact.affectedFiles.size,
                reindexedAtoms: reindexResult.atoms?.length || 0
            },
            changes: buildAtomicEditChanges(impact),
            autoFixed,
            autoFixedFiles,
            semanticPurity,
            warnings: allWarnings.length > 0 ? allWarnings : undefined,
            crossFileDuplicates: preValidation.crossFileDuplicates?.length > 0 ? preValidation.crossFileDuplicates : undefined,
            blastRadius: preValidation.blastRadius,
            solidViolations: Object.values(preValidation.solidViolations).some((value) => value !== null)
                ? preValidation.solidViolations
                : undefined
        }, `Atomic edit successful${autoFixed ? ` (AutoFixed ${autoFixedFiles} callers)` : ''}`);
    }
}

export const atomic_edit = async (args, context) => {
    const tool = new AtomicEditorTool();
    return tool.execute(args, context);
};
