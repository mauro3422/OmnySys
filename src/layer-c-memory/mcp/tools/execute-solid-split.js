
import { SOLIDNormalizer } from '../core/shared/solid-normalizer.js';
import { createLogger } from '../../../utils/logger.js';
import { atomic_write } from './atomic-edit/index.js';

const logger = createLogger('OmnySys:mcp:solid_split');

/**
 * Tool: mcp_omnysystem_execute_solid_split
 * Analiza una función y genera una propuesta de división SOLID.
 * Si se proporciona 'execute: true', aplica los cambios de forma atómica.
 * 
 * @param {Object} args - Argumentos: { filePath, symbolName, execute }
 * @param {Object} context - Contexto del servidor MCP
 * @returns {Promise<Object>} Propuesta de refactorización o resultado de ejecución
 */
export async function execute_solid_split(args, context) {
    const { filePath, symbolName, execute = false } = args;
    const { projectPath } = context;

    if (!filePath || !symbolName) {
        return { error: 'Missing required parameters: filePath, symbolName' };
    }

    logger.info(`[Tool] execute_solid_split("${filePath}", "${symbolName}", execute: ${execute})`);

    try {
        const proposal = await SOLIDNormalizer.proposeSplit(filePath, symbolName, projectPath);

        if (!proposal.success) {
            return proposal;
        }

        if (execute) {
            // Aplicar la refactorización (Simplificado para el MVP: atomic_write del original modificado)
            // En una versión más robusta, crearíamos nuevos archivos para las funciones extraídas
            // o las insertaríamos antes del original.

            let fullContent = proposal.modifiedOriginal;
            // Unimos las nuevas funciones al final o antes (esto es trivial para el prototipo)
            for (const newFunc of proposal.newFunctions) {
                fullContent += '\n' + newFunc.code;
            }

            // Usamos atomic_write para persistir y validar
            // TODO: En Fase 12.2 implementaremos "Atomic Transactions" para multiedit seguro
            const writeResult = await atomic_write({
                filePath,
                content: fullContent
            }, context);

            return {
                success: true,
                message: 'SOLID split applied successfully',
                writeResult
            };
        }

        // Si no es execute, devolvemos la propuesta para validación del usuario
        return {
            success: true,
            isProposal: true,
            message: 'Refactoring proposal generated. Review and call with execute:true to apply.',
            proposal
        };

    } catch (error) {
        logger.error(`[Tool] execute_solid_split failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
