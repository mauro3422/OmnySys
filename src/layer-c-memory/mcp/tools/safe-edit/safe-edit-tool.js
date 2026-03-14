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

  if (!projectPath) {
    return formatError('MISSING_PROJECT_PATH', 'projectPath not provided in context');
  }

  if (!filePath || !newContent) {
    return formatError('INVALID_PARAMS', 'Missing required parameters: filePath, newContent');
  }

  if (!lineNumber && !pattern) {
    return formatError('INVALID_PARAMS', 'Either lineNumber OR pattern must be provided');
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

    // 2. Si hay pattern, buscarlo dentro del contexto
    let oldString = editContext.suggestedOldString;
    if (pattern) {
      const foundInContext = findInContext(editContext.fullContext, pattern);
      if (foundInContext) {
        oldString = foundInContext;
      } else {
        // Buscar en todo el archivo
        const fs = await import('fs/promises');
        const fullPath = path.join(projectPath, filePath);
        const fileContent = await fs.readFile(fullPath, 'utf8');
        const foundInFile = findInContext(fileContent, pattern);
        if (foundInFile) {
          oldString = foundInFile;
        } else {
          return formatError('PATTERN_NOT_FOUND', `Pattern not found: ${pattern}`);
        }
      }
    }

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

    // 5. Crear backup si se solicita
    let backupPath = null;
    if (autoBackup) {
      backupPath = await createBackup(filePath, projectPath);
      logger.debug(`[safe_edit] Backup created: ${backupPath}`);
    }

    // 6. Ejecutar atomic_edit
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

      // 7. Limpieza de backups viejos (opcional)
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
        warnings: validation.warnings || [],
        editResult
      };

    } catch (editError) {
      // 8. Rollback si falla
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

  } catch (error) {
    logger.error(`[safe_edit] Unexpected error: ${error.message}`);
    return formatError('UNEXPECTED_ERROR', `Unexpected error: ${error.message}`);
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
