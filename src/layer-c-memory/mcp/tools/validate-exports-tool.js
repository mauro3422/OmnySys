/**
 * @fileoverview validate-exports-tool.js
 *
 * MCP Tool: validate_exports
 * Valida que los exports de un archivo existen y la cadena está completa.
 */

import { validateAllExports, traceExportChain, getFileExports } from './validate-exports-chain.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:MCP:ValidateExports');

/**
 * Tool principal: validate_exports
 * @param {Object} args - Argumentos del tool
 * @param {string} args.filePath - Archivo a validar
 * @param {string} [args.importName] - Nombre específico a validar (opcional)
 * @param {string} [args.fromModule] - Módulo del import (usar con importName)
 * @param {Object} context - Contexto MCP
 * @returns {Promise<Object>} Resultado de validación
 */
export async function validate_exports(args, context) {
  const { filePath, importName, fromModule } = args;
  const { projectPath } = context;

  if (!projectPath) {
    return formatError('MISSING_PROJECT_PATH', 'projectPath not provided in context');
  }

  if (!filePath) {
    return formatError('INVALID_PARAMS', 'filePath is required');
  }

  logger.info(`[validate_exports] Validating exports for ${filePath}`);

  try {
    let result;

    if (importName && fromModule) {
      // Validar un export específico
      const chainResult = await traceExportChain(projectPath, filePath, importName, fromModule);
      result = {
        valid: chainResult.found,
        importName,
        fromModule,
        chain: chainResult.chain,
        error: chainResult.error,
        originFile: chainResult.originFile
      };
    } else {
      // Validar todos los imports del archivo
      result = await validateAllExports(projectPath, filePath);
    }

    if (result.valid) {
      return {
        success: true,
        message: 'All exports are valid',
        filePath,
        ...result
      };
    } else {
      return {
        success: true,
        message: `Found ${result.invalidCount || 1} invalid export(s)`,
        filePath,
        severity: 'high',
        ...result
      };
    }
  } catch (error) {
    logger.error(`[validate_exports] Error: ${error.message}`);
    return formatError('VALIDATION_FAILED', `Failed to validate exports: ${error.message}`);
  }
}

/**
 * Formatea error estándar
 */
function formatError(code, message, details = {}) {
  return {
    success: false,
    error: { code, message },
    ...details,
    severity: details.severity || 'high'
  };
}
