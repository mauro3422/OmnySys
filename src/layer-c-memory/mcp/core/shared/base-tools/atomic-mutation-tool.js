/**
 * @fileoverview Clase base para herramientas MCP que mutan el código fuente.
 * Abstrae el TransactionManager, las validaciones y el autoFix.
 */

import { BaseMCPTool } from './base-tool.js';
import { getAtomicEditor } from '../../../../../core/atomic-editor/index.js';

export class AtomicMutationTool extends BaseMCPTool {
    constructor(toolName) {
        super(toolName);
    }

    /**
     * Ejecuta una mutación atómica dentro de una transacción segura.
     * Provee rollback automático si la validación falla o hay un error.
     * 
     * @param {Object} args - Argumentos del MCP (incluye autoFix)
     * @param {Function} mutationLogic - Async Callback que recibe el ID de transacción y genera/aplica el código
     * @param {Function} customValidator - Async Callback para validaciones post-edición
     */
    async runInTransaction(args, mutationLogic, customValidator = null) {
        const { autoFix = false } = args;
        const projectPath = this.context.projectPath;
        const atomicEditor = this.context.orchestrator?.atomicEditor || getAtomicEditor(projectPath, this.context.orchestrator);

        // Iniciar Transacción
        await atomicEditor.beginTransaction(this.name);
        this.logger.info(`[Transaction] Started for ${this.name} (autoFix: ${autoFix})`);

        try {
            // 1. Ejecutar Lógica de Mutación Específica
            const mutationResult = await mutationLogic(this.name);

            if (!mutationResult.success) {
                await atomicEditor.rollbackTransaction();
                return this.formatError('MUTATION_FAILED', mutationResult.message || 'Specific mutation logic failed', mutationResult);
            }

            // 2. Validación Post-Edición
            if (customValidator) {
                const validation = await customValidator(mutationResult);

                if (!validation.valid) {
                    await atomicEditor.rollbackTransaction();

                    if (autoFix && validation.brokenCallers?.length > 0) {
                        this.logger.warn(`[Transaction] Validation failed but autoFix is ON. Proposing Cascade fix...`);
                        return this.formatError('POST_VALIDATION_WITH_AUTOFIX',
                            'Validation failed, cascade action needed',
                            { brokenCallers: validation.brokenCallers }
                        );
                    }

                    return this.formatError('POST_VALIDATION_FAILED', 'Broken graph after mutation', { validation });
                }
            }

            // 3. Commit de Transacción
            await atomicEditor.commitTransaction();
            this.logger.info(`[Transaction] Committed successfully`);

            return this.formatSuccess(mutationResult, `Operation applied atomically`);

        } catch (error) {
            await atomicEditor.rollbackTransaction();
            this.logger.error(`[Transaction] FAILED and ROLLED BACK: ${error.message}`);
            return this.formatError('TRANSACTION_ROLLED_BACK', error.message);
        }
    }

    // Helper abstrato para que los hijos implementen la interfaz `performAction`
    async performAction(args) {
        // Los hijos deben mapear `args` a una llamada a `runInTransaction`
        throw new Error(`[AtomicMutationTool] performAction() must implement runInTransaction in ${this.name}`);
    }
}
