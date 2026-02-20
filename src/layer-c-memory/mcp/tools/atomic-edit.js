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
import { checkImportExists } from './validate-imports.js';

const logger = createLogger('OmnySys:atomic:edit:tool');

/**
 * Extrae imports de un string de código
 */
function extractImports(code) {
  const imports = [];
  const importRegex = /import\s+(?:{[^}]+}|[^'"]+)?\s*from\s+['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1] || match[2]);
  }
  return imports;
}

/**
 * Valida que todos los imports en el nuevo código existan
 */
async function validateImportsInEdit(filePath, newString, projectPath) {
  const imports = extractImports(newString);
  const brokenImports = [];
  
  for (const importPath of imports) {
    // Solo validar imports de proyecto (no node_modules)
    if (importPath.startsWith('.') || importPath.startsWith('#')) {
      const check = await checkImportExists(importPath, filePath, projectPath);
      if (!check.exists) {
        brokenImports.push({
          import: importPath,
          attemptedPaths: check.attemptedPaths,
          suggestion: `Verificar que el módulo "${importPath}" exista. Intentado: ${check.attemptedPaths.slice(0, 3).join(', ')}`
        });
      }
    }
  }
  
  return brokenImports;
}

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
    // PASO 1: Validar que los imports en el nuevo código existan
    const brokenImports = await validateImportsInEdit(filePath, newString, projectPath);
    if (brokenImports.length > 0) {
      return {
        error: 'BROKEN_IMPORTS',
        message: `Found ${brokenImports.length} broken imports in the edit`,
        file: filePath,
        brokenImports,
        severity: 'critical',
        canProceed: false,
        suggestion: 'Fix the imports before proceeding. Use validate_imports({ filePath, checkFileExistence: true }) for details.'
      };
    }
    
    // PASO 2: Obtener atomic editor del orchestrator
    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    
    // PASO 3: Realizar edición atómica
    const result = await atomicEditor.edit(filePath, oldString, newString);
    
    return {
      success: true,
      file: filePath,
      message: `✅ Atomic edit successful`,
      impact: {
        affectedFiles: result.impact?.affectedFiles?.length || 0,
        changedSymbols: result.impact?.changedSymbols || [],
        severity: result.impact?.severity || 'none'
      },
      validation: {
        syntaxValid: true,
        timestamp: Date.now()
      }
    };
    
  } catch (error) {
    logger.error(`[Tool] atomic_edit failed: ${error.message}`);
    
    // Detectar si es error de sintaxis
    if (error.message.includes('Syntax error') || error.message.includes('SyntaxError')) {
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
    // PASO 1: Validar que los imports en el nuevo código existan
    const brokenImports = await validateImportsInEdit(filePath, content, projectPath);
    if (brokenImports.length > 0) {
      return {
        error: 'BROKEN_IMPORTS',
        message: `Found ${brokenImports.length} broken imports in the new file`,
        file: filePath,
        brokenImports,
        severity: 'critical',
        canProceed: false,
        suggestion: 'Fix the imports before proceeding. Use validate_imports({ filePath, checkFileExistence: true }) for details.'
      };
    }
    
    // PASO 2: Escribir archivo
    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    
    const result = await atomicEditor.write(filePath, content);
    
    return {
      success: true,
      file: filePath,
      message: `✅ Atomic write successful`,
      validation: {
        syntaxValid: true,
        importsValid: true
      }
    };
    
  } catch (error) {
    return {
      error: error.message,
      file: filePath
    };
  }
}
