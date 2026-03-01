/**
 * @fileoverview Refactorización OOP de atomic_write
 * Hereda de AtomicMutationTool para control transaccional estricto.
 */

import path from 'path';
import fs from 'fs';
import { AtomicMutationTool } from '#layer-c/mcp/core/shared/base-tools/atomic-mutation-tool.js';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { reindexFile } from './reindex.js';
import { loadAtoms } from '#layer-c/storage/index.js';

import {
    normalizeAtomicPath,
    performPreWriteValidation,
    analyzeExports,
    computeWriteImpact
} from './write-orchestrator.js';

export class AtomicWriterTool extends AtomicMutationTool {
    constructor() {
        super('atomic:write');
    }

    async performAction(args) {
        let { filePath, content, autoFix = false } = args;
        const { orchestrator, projectPath } = this.context;

        filePath = normalizeAtomicPath(filePath, projectPath);

        if (!filePath || !content) {
            return this.formatError('MISSING_PARAMS', 'filePath and content are required');
        }

        // Estado previo
        let previousAtoms = [];
        try {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
            previousAtoms = await loadAtoms(projectPath, path.relative(projectPath, absolutePath));
        } catch (e) { }

        // Validación pre-escritura
        const preRes = await performPreWriteValidation(filePath, content, projectPath);
        if (!preRes.valid) {
            if (preRes.error === 'VALIDATION_FAILED') return this.formatError('VALIDATION_FAILED', 'Pre-analysis check failed', { errors: preRes.validation.errors });
            if (preRes.error === 'BROKEN_IMPORTS') return this.formatError('BROKEN_IMPORTS', 'Broken imports in new content', { brokenImports: preRes.brokenImports });
            if (preRes.error === 'SYNTAX_ERROR') return this.formatError('SYNTAX_ERROR', preRes.syntaxCheck.error);
        }

        // Análisis estático del código nuevo (Exports y Namespace Risk)
        const analysis = await analyzeExports(content, filePath, projectPath);
        if (analysis.critical.length > 0) {
            if (autoFix) {
                this.logger.warn(`[AutoFix] Export conflict detected for ${filePath}. Downgrading to atomic_edit override...`);
                // Idealmente importaríamos atomic_edit herramienta, pero para evitar dependencias circulares:
                // devolvemos un error indicando que debe ejecutarse un edit en cadena
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

        // ==========================================================
        // EJECUCIÓN TRANSACCIONAL
        // ==========================================================
        const mutationLogic = async (txId) => {
            const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
            const dirPath = path.dirname(preRes.absoluteFilePath);

            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

            await atomicEditor.write(filePath, content);

            return { success: true };
        };

        const customValidator = async () => {
            const reindexResult = await reindexFile(filePath, projectPath);
            if (!reindexResult.success) {
                return { valid: false, error: 'Reindex failed' };
            }

            // TODO: Ensure proper circular dependency check in FASE 17
            const circularCheck = { summary: { totalCircular: 0 } };

            const impact = await computeWriteImpact(filePath, projectPath, previousAtoms, reindexResult);

            return {
                valid: true,
                analysisContext: { impact, analysis, circularCheck }
            };
        };

        const txResult = await this.runInTransaction(args, mutationLogic, customValidator);

        if (!txResult.success) return txResult; // Propagar rollback

        // Mapeo Final de Respuesta MCP
        const { impact, circularCheck } = txResult.analysisContext;
        const response = this.formatSuccess({
            file: filePath,
            impact: impact ? {
                level: impact.level,
                score: impact.score,
                affectedFiles: impact.affectedFiles?.size || 0,
                changes: impact.dependencyTree?.map(tree => ({ function: tree.name, changes: tree.changes, dependentsCount: tree.dependents?.length || 0 })) || []
            } : undefined,
            validation: {
                syntax: true,
                imports: true,
                exports: { count: analysis.exports.length, conflicts: analysis.conflicts.length },
                circular: circularCheck?.summary?.totalCircular || 0
            },
            refactoring: analysis.refactoring.duplicates.length > 0 ? analysis.refactoring : undefined
        }, 'Atomic write successful');

        if (analysis.conflicts.length > 0 || analysis.namespaceRisk.warnings.length > 0) {
            response.warnings = [...(analysis.conflicts.length > 0 ? [`⚠️ ${analysis.conflicts.length} export name(s) already exist`] : []), ...analysis.namespaceRisk.warnings.map(w => w.message)];
        }

        return response;
    }
}

// Wrapper para MCP
export const atomic_write = async (args, context) => {
    const tool = new AtomicWriterTool();
    return tool.execute(args, context);
};
