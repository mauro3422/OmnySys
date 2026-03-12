/**
 * @fileoverview OOP implementation of atomic_write.
 * Inherits from AtomicMutationTool for strict transactional control.
 */

import path from 'path';
import fs from 'fs';
import { AtomicMutationTool } from '#layer-c/mcp/core/shared/base-tools/atomic-mutation-tool.js';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { reindexFile } from './reindex.js';
import {
    normalizeAtomicPath,
    performPreWriteValidation,
    analyzeExports,
    computeWriteImpact
} from './write-orchestrator.js';
import { summarizeAtomSemanticPurity } from '../../../../shared/compiler/index.js';
import {
    loadPreviousAtomsForWrite,
    buildDuplicateRiskError,
    enforceCrossFileDuplicateGuard,
    buildAtomicWriteWarnings
} from './atomic-write-helpers.js';

export class AtomicWriterTool extends AtomicMutationTool {
    constructor() {
        super('atomic:write');
    }

    async performAction(args) {
        let { filePath, content, autoFix = false, failOnDuplicate = false } = args;
        const { orchestrator, projectPath } = this.context;

        if (!filePath || !content) {
            return this.formatError('INVALID_PARAMS', 'Missing required parameters: filePath and content');
        }

        filePath = normalizeAtomicPath(filePath, projectPath);
        const previousAtoms = await loadPreviousAtomsForWrite(projectPath, filePath);

        const preRes = await performPreWriteValidation(filePath, content, projectPath);
        if (!preRes.valid) {
            if (preRes.error === 'VALIDATION_FAILED') {
                return this.formatError('VALIDATION_FAILED', 'Pre-analysis check failed', { errors: preRes.validation.errors });
            }
            if (preRes.error === 'BROKEN_IMPORTS') {
                return this.formatError('BROKEN_IMPORTS', 'Broken imports in new content', { brokenImports: preRes.brokenImports });
            }
            if (preRes.error === 'SYNTAX_ERROR') {
                return this.formatError('SYNTAX_ERROR', preRes.syntaxCheck.error);
            }
        }

        const analysis = await analyzeExports(content, filePath, projectPath);
        const duplicateCandidates = analysis?.refactoring?.duplicates || [];

        const duplicateRiskError = buildDuplicateRiskError(this, duplicateCandidates, failOnDuplicate);
        if (duplicateRiskError) {
            return duplicateRiskError;
        }

        const crossFileDuplicateError = await enforceCrossFileDuplicateGuard({
            content,
            filePath,
            failOnDuplicate,
            context: this.context,
            logger: this.logger,
            formatError: this.formatError.bind(this)
        });
        if (crossFileDuplicateError) {
            return crossFileDuplicateError;
        }

        if (analysis.critical.length > 0) {
            if (autoFix) {
                this.logger.warn(`[AutoFix] Export conflict detected for ${filePath}. Downgrading to atomic_edit override...`);
                return this.formatError('EXPORT_CONFLICT', `Found ${analysis.critical.length} extremely critical export conflicts`, {
                    suggestion: 'Use atomic_edit with autoFix: true to override the existing symbol.',
                    conflicts: analysis.critical
                });
            }

            return this.formatError('EXPORT_CONFLICT', `Found ${analysis.critical.length} critical export conflicts.`, {
                severity: 'critical',
                conflicts: analysis.critical
            });
        }

        if (analysis.namespaceRisk.level === 'high') {
            return this.formatError('HIGH_NAMESPACE_RISK', 'High namespace risk detected', { risk: analysis.namespaceRisk });
        }

        const mutationLogic = async () => {
            const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
            const dirPath = path.dirname(preRes.absoluteFilePath);

            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            await atomicEditor.write(filePath, content);
            return { success: true };
        };

        const customValidator = async () => {
            const reindexResult = await reindexFile(filePath, projectPath);
            if (!reindexResult.success) {
                return { valid: false, error: 'Reindex failed' };
            }

            const circularCheck = { summary: { totalCircular: 0 } };
            const impact = await computeWriteImpact(filePath, projectPath, previousAtoms, reindexResult);

            return {
                valid: true,
                analysisContext: { impact, analysis, circularCheck, reindexResult }
            };
        };

        const txResult = await this.runInTransaction(args, mutationLogic, customValidator);
        if (!txResult.success) {
            return txResult;
        }

        const { impact, circularCheck, reindexResult } = txResult.analysisContext;
        const semanticPurity = summarizeAtomSemanticPurity(reindexResult?.atoms || []);
        const response = this.formatSuccess({
            file: filePath,
            impact: impact ? {
                level: impact.level,
                score: impact.score,
                affectedFiles: impact.affectedFiles?.size || 0,
                changes: impact.dependencyTree?.map((tree) => ({
                    function: tree.name,
                    changes: tree.changes,
                    dependentsCount: tree.dependents?.length || 0
                })) || []
            } : undefined,
            validation: {
                syntax: true,
                imports: true,
                exports: { count: analysis.exports.length, conflicts: analysis.conflicts.length },
                circular: circularCheck?.summary?.totalCircular || 0
            },
            semanticPurity,
            refactoring: analysis.refactoring.duplicates.length > 0 ? analysis.refactoring : undefined
        }, 'Atomic write successful');

        const warnings = buildAtomicWriteWarnings(analysis, duplicateCandidates);
        if (warnings.length > 0) {
            response.warnings = warnings;
        }

        return response;
    }
}

export const atomic_write = async (args, context) => {
    const tool = new AtomicWriterTool();
    return tool.execute(args, context);
};
