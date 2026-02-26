
import { MoveOrchestrator } from '../core/shared/move-orchestrator.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:move_file');

/**
 * Tool: mcp_omnysystem_move_file
 * Mueve un archivo físicamente y actualiza todas sus referencias (imports) en el resto del proyecto.
 * 
 * @param {Object} args - Argumentos: { oldPath, newPath }
 * @param {Object} context - Contexto del servidor MCP
 * @returns {Promise<Object>} Resultado de la operación y lista de archivos actualizados
 */
export async function move_file(args, context) {
    const { oldPath, newPath } = args;
    const { projectPath } = context;

    if (!oldPath || !newPath) {
        return { error: 'Missing required parameters: oldPath, newPath' };
    }

    logger.info(`[Tool] move_file("${oldPath}" -> "${newPath}")`);

    try {
        const result = await MoveOrchestrator.moveFile(oldPath, newPath, projectPath, context);
        return result;
    } catch (error) {
        logger.error(`[Tool] move_file failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
