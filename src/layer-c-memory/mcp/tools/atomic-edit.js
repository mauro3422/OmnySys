/**
 * @fileoverview atomic-edit.js
 * 
 * MCP Tool: atomic_edit
 * Edita archivos con validación atómica completa
 * 
 * Diferencia con edit normal:
 * - Valida sintaxis ANTES de guardar
 * - Propaga vibración a dependientes
 * - Invalida cachés automáticamente
 * - Previene errores que rompen el sistema
 */

import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:atomic:edit:tool');

/**
 * Tool: atomic_edit
 * Edita un archivo con validación atómica
 * 
 * @example
 * atomic_edit({
 *   filePath: "src/core/orchestrator/helpers.js",
 *   oldString: "function old() {}",
 *   newString: "function new() { return true; }"
 * })
 */
export async function atomic_edit(args, context) {
  const { filePath, oldString, newString } = args;
  const { orchestrator, projectPath } = context;
  
  logger.info(`[Tool] atomic_edit("${filePath}")`);
  
  if (!filePath || !oldString || !newString) {
    return {
      error: 'Missing required parameters: filePath, oldString, newString',
      example: 'atomic_edit({ filePath: "src/utils/helper.js", oldString: "const x = 1;", newString: "const x = 2;" })'
    };
  }
  
  try {
    // Obtener atomic editor del orchestrator
    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    
    // Realizar edición atómica
    const result = await atomicEditor.edit(filePath, oldString, newString);
    
    return {
      success: true,
      file: filePath,
      message: `✅ Atomic edit successful`,
      impact: {
        affectedFiles: result.impact.affectedFiles.length,
        changedSymbols: result.impact.changedSymbols,
        severity: result.impact.severity
      },
      validation: {
        syntaxValid: true,
        timestamp: Date.now()
      }
    };
    
  } catch (error) {
    logger.error(`[Tool] atomic_edit failed: ${error.message}`);
    
    // Detectar si es error de sintaxis
    if (error.message.includes('Syntax error')) {
      return {
        error: 'SYNTAX_ERROR',
        message: error.message,
        file: filePath,
        suggestion: 'Fix the syntax error before editing',
        severity: 'critical',
        canProceed: false
      };
    }
    
    // Otros errores
    return {
      error: error.message,
      file: filePath,
      suggestion: 'Check file permissions and try again'
    };
  }
}

/**
 * Tool: atomic_write
 * Escribe un archivo nuevo con validación atómica
 */
export async function atomic_write(args, context) {
  const { filePath, content } = args;
  const { orchestrator, projectPath } = context;
  
  logger.info(`[Tool] atomic_write("${filePath}")`);
  
  if (!filePath || !content) {
    return {
      error: 'Missing required parameters: filePath, content'
    };
  }
  
  try {
    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    
    const result = await atomicEditor.write(filePath, content);
    
    return {
      success: true,
      file: filePath,
      message: `✅ Atomic write successful`,
      validation: {
        syntaxValid: true
      }
    };
    
  } catch (error) {
    return {
      error: error.message,
      file: filePath
    };
  }
}
