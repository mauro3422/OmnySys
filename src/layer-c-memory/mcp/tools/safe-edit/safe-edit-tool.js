/**
 * @fileoverview safe-edit-tool.js
 *
 * MCP Tool: safe_edit
 * 
 * Editor de alto nivel con:
 * - Contexto automático (no requiere leer antes)
 * - Backup automático
 * - Dry-run mode
 * - Validación extendida
 * 
 * Usa internamente atomic_edit para la ejecución atómica.
 */

import path from 'path';
import { atomic_edit } from '../atomic-edit/index.js';
import { getEditContext, findInContext, getFileAtoms } from './context-resolver.js';
import { createBackup, restoreBackup, cleanupOldBackups } from './backup-manager.js';
import { validateEditIntent } from './validation-ext.js';
import { createLogger } from '#utils/logger.js';
import { formatError } from '../../core/shared/utils/error-formatter.js';

const logger = createLogger('OmnySys:MCP:SafeEdit');

/**
 * Tool principal safe_edit
 * @param {Object} args - Argumentos del tool
 * @param {string} args.filePath - Ruta del archivo a editar
 * @param {number} [args.lineNumber] - Línea objetivo (opcional, si no se usa pattern)
 * @param {string} [args.pattern] - Patrón a buscar (opcional, si no se usa lineNumber)
 * @param {string} args.newContent - Nuevo contenido a insertar
 * @param {boolean} [args.autoBackup=true] - Crear backup automático
 * @param {boolean} [args.dryRun=false] - Solo mostrar qué haría (no ejecutar)
 * @param {number} [args.linesBefore=3] - Líneas de contexto antes
 * @param {number} [args.linesAfter=3] - Líneas de contexto después
 * @param {Object} context - Contexto MCP (projectPath, etc.)
 * @returns {Promise<Object>} Resultado de la edición
 */
export async function safe_edit(args, context) {
  const {
    filePath,
    lineNumber,
    pattern,
    newContent,
    autoBackup = true,
    dryRun = false,
    linesBefore = 3,
    linesAfter = 3
  } = args;

  const { projectPath } = context;

  const validationResult = validateSafeEditParams(args, context);
  if (validationResult.error) {
    return validationResult.error;
  }

  logger.info(`[safe_edit] Starting edit for ${filePath}:${lineNumber || 'pattern'}`);

  try {
    // 1. Obtener contexto exacto
    const editContext = await getEditContext({
      projectPath,
      filePath,
      lineNumber: lineNumber || 1,  // Si es pattern, empezamos desde línea 1
      linesBefore,
      linesAfter
    });

    // 2. Resolver oldString (con o sin pattern)
    const resolved = await resolveOldStringWithPattern({
      pattern,
      editContext,
      projectPath,
      filePath
    });
    if (resolved.error) {
      return resolved.error;
    }
    const oldString = resolved.oldString;

    // 3. Validación extendida del intent de edición
    const validation = await validateEditIntent({
      filePath,
      oldString,
      newContent,
      projectPath,
      editContext
    });

    if (!validation.valid) {
      return formatError('VALIDATION_FAILED', 'Edit validation failed', { errors: validation.errors });
    }

    // 4. Dry run mode
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: 'Dry run completed successfully',
        editPlan: {
          filePath,
          oldString,
          newContent,
          context: editContext,
          affectedAtoms: editContext.atomId ? [editContext.atomId] : [],
          warnings: validation.warnings || []
        }
      };
    }

    // 5-8. Ejecutar con backup y rollback automático
    return await executeWithBackup({
      filePath,
      projectPath,
      oldString,
      newContent,
      autoBackup,
      context,
      editContext,
      validationWarnings: validation.warnings || []
    });

  } catch (error) {
    logger.error(`[safe_edit] Unexpected error: ${error.message}`);
    return formatError('UNEXPECTED_ERROR', `Unexpected error: ${error.message}`);
  }
}



/**
 * Helper para obtener contexto sin editar (útil para debugging)
 */
export async function get_safe_edit_context(args, context) {
  const { filePath, lineNumber = 1, linesBefore = 3, linesAfter = 3 } = args;
  const { projectPath } = context;

  if (!projectPath || !filePath) {
    return { error: 'Missing projectPath or filePath' };
  }

  try {
    const editContext = await getEditContext({
      projectPath,
      filePath,
      lineNumber,
      linesBefore,
      linesAfter
    });

    const atoms = await getFileAtoms(projectPath, filePath);

    return {
      success: true,
      context: editContext,
      fileAtoms: atoms.map(a => ({
        id: a.id,
        name: a.name,
        type: a.atom_type,
        range: { start: a.line_start, end: a.line_end }
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Resuelve el oldString usando el patrón suministrado.
 */
async function resolveOldStringWithPattern({ pattern, editContext, projectPath, filePath }) {
  let oldString = editContext.suggestedOldString;
  if (!pattern) return { oldString };

  const foundInContext = findInContext(editContext.fullContext, pattern);
  if (foundInContext) {
    return { oldString: foundInContext };
  }

  // Buscar en todo el archivo si no se encuentra en el contexto
  const fs = await import('fs/promises');
  const fullPath = path.join(projectPath, filePath);
  const fileContent = await fs.readFile(fullPath, 'utf8');
  const foundInFile = findInContext(fileContent, pattern);
  if (foundInFile) {
    return { oldString: foundInFile };
  }

  return { error: formatError('PATTERN_NOT_FOUND', `Pattern not found: ${pattern}`) };
}

/**
 * Ejecuta la edición con soporte para backup y rollback
 */
async function executeWithBackup({
  filePath,
  projectPath,
  oldString,
  newContent,
  autoBackup,
  context,
  editContext,
  validationWarnings
}) {
  let backupPath = null;
  if (autoBackup) {
    backupPath = await createBackup(filePath, projectPath);
    logger.debug(`[safe_edit] Backup created: ${backupPath}`);
  }

  let editResult;
  try {
    editResult = await atomic_edit(
      {
        filePath,
        oldString,
        newString: newContent,
        autoFix: false  // safe_edit maneja sus propios errores
      },
      context
    );

    if (!editResult.success) {
      throw new Error(editResult.message || 'atomic_edit failed');
    }

    logger.info(`[safe_edit] Edit successful for ${filePath}`);

    if (autoBackup) {
      await cleanupOldBackups(projectPath, filePath);
    }

    return {
      success: true,
      message: 'Edit completed successfully',
      filePath,
      backupPath,
      context: {
        atomId: editContext.atomId,
        atomName: editContext.atomName,
        lineRange: editContext.lineRange
      },
      warnings: validationWarnings,
      editResult
    };

  } catch (editError) {
    logger.error(`[safe_edit] Edit failed: ${editError.message}`);
    
    if (autoBackup && backupPath) {
      try {
        await restoreBackup(filePath, projectPath, backupPath);
        logger.warn(`[safe_edit] Rollback completed from backup: ${backupPath}`);
      } catch (rollbackError) {
        logger.error(`[safe_edit] Rollback failed: ${rollbackError.message}`);
      }
    }

    return formatError('EDIT_FAILED', `Edit operation failed: ${editError.message}`, {
      originalError: editError.message,
      backupPath,
      canRestore: autoBackup && !!backupPath
    });
  }
}

/**
 * Valida los parámetros iniciales de la herramienta safe_edit.
 */
function validateSafeEditParams(args, context) {
  const { filePath, newContent, lineNumber, pattern } = args;
  const { projectPath } = context;

  if (!projectPath) {
    return { error: formatError('MISSING_PROJECT_PATH', 'projectPath not provided in context') };
  }

  if (!filePath || !newContent) {
    return { error: formatError('INVALID_PARAMS', 'Missing required parameters: filePath, newContent') };
  }

  if (!lineNumber && !pattern) {
    return { error: formatError('INVALID_PARAMS', 'Either lineNumber OR pattern must be provided') };
  }

  return { valid: true };
}
