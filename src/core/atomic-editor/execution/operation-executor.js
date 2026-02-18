/**
 * @fileoverview Operation Executor - Ejecución de operaciones atómicas
 * 
 * Responsabilidad Única (SRP): Ejecutar operaciones con validación y lifecycle.
 * 
 * @module atomic-editor/execution
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:atomic:editor:execution');

/**
 * Fases de ejecución de una operación
 * @typedef {Object} ExecutionPhase
 * @property {string} name - Nombre de la fase
 * @property {Function} execute - Función a ejecutar
 */

/**
 * Ejecuta una operación con todas sus fases de validación
 * 
 * @param {Object} operation - Operación a ejecutar
 * @param {Object} options - Opciones de ejecución
 * @param {Object} options.validators - Validadores disponibles
 * @param {boolean} options.enableSafetyChecks - Habilitar validaciones de seguridad
 * @param {boolean} options.enableSyntaxValidation - Habilitar validación de sintaxis
 * @param {boolean} options.enableUndo - Habilitar undo/redo
 * @param {Function} options.emit - Función para emitir eventos
 * @param {Function} options.getModifiedContent - Función para obtener contenido modificado
 * @returns {Promise<Object>} Resultado de la ejecución
 */
export async function executeOperation(operation, options) {
  const {
    validators,
    enableSafetyChecks,
    enableSyntaxValidation,
    enableUndo,
    emit,
    getModifiedContent
  } = options;

  const skipValidation = options.skipValidation || false;
  const skipSafety = options.skipSafety || false;

  try {
    // Phase 1: Safety validation
    if (enableSafetyChecks && !skipSafety) {
      logger.info(`  🔒 Validating safety...`);
      const safety = await validators.safety.validateEdit(operation.filePath, {
        oldString: operation.options?.oldString,
        newString: operation.options?.newString
      });
      
      if (!safety.safe) {
        throw new Error(`Safety check failed: ${safety.error}`);
      }
      logger.info(`  ✅ Safety passed`);
    }

    // Phase 2: Operation-specific validation
    if (!skipValidation) {
      logger.info(`  🔍 Validating operation...`);
      const validation = await operation.validate();
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.error}`);
      }
      logger.info(`  ✅ Operation valid`);
    }

    // Phase 3: Syntax validation (if JS/TS)
    if (enableSyntaxValidation && operation.options?.newString) {
      const ext = operation.filePath.match(/\.[^.]+$/);
      if (ext && ['.js', '.ts', '.mjs', '.cjs'].includes(ext[0])) {
        logger.info(`  🔍 Validating syntax...`);
        const modifiedContent = await getModifiedContent(operation);
        const syntax = await validators.syntax.validate(operation.filePath, modifiedContent);
        
        if (!syntax.valid) {
          emit('atom:validation:failed', {
            file: operation.filePath,
            error: syntax.error,
            line: syntax.line,
            column: syntax.column,
            severity: 'critical'
          });
          
          logger.error(`  ❌ SYNTAX ERROR:`);
          logger.error(`     ${syntax.error}`);
          logger.error(`     Line ${syntax.line}, Column ${syntax.column}`);
          
          throw new Error(`Syntax error prevents edit: ${syntax.error}`);
        }
        logger.info(`  ✅ Syntax valid`);
      }
    }

    // Phase 4: Execute
    logger.info(`  ⚡ Executing ${operation.type}...`);
    const result = await operation.execute();

    if (!result.success) {
      throw result.error || new Error('Operation failed');
    }

    // Phase 5: Prepare undo (after execute, so operation has original content)
    let undoData = null;
    if (enableUndo) {
      undoData = await operation.prepareUndo();
    }

    logger.info(`  ✅ Operation complete`);
    
    return {
      ...result,
      undoData
    };

  } catch (error) {
    emit('atom:edit:failed', {
      file: operation.filePath,
      operation: operation.type,
      error: error.message,
      timestamp: Date.now()
    });
    
    logger.error(`  ❌ Operation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Ejecuta validación de escritura de archivo nuevo
 * 
 * @param {string} filePath - Path del archivo
 * @param {string} content - Contenido a escribir
 * @param {Object} validators - Validadores
 * @param {Object} options - Opciones
 * @param {boolean} options.enableSafetyChecks - Validar seguridad
 * @param {boolean} options.enableSyntaxValidation - Validar sintaxis
 * @returns {Promise<Object>} Resultado de la validación
 */
export async function validateWrite(filePath, content, validators, options) {
  const { enableSafetyChecks, enableSyntaxValidation } = options;
  
  // Validate safety first
  if (enableSafetyChecks) {
    const safety = await validators.safety.validateWrite(filePath, content);
    if (!safety.safe) {
      return {
        valid: false,
        error: `Safety check failed: ${safety.error}`
      };
    }
  }

  // Validate syntax
  if (enableSyntaxValidation && filePath.match(/\.(js|ts|mjs|cjs)$/)) {
    logger.info(`  🔍 Validating syntax...`);
    const validation = await validators.syntax.validate(filePath, content);
    
    if (!validation.valid) {
      return {
        valid: false,
        error: `Syntax error prevents write: ${validation.error}`,
        line: validation.line,
        column: validation.column
      };
    }
    
    logger.info(`  ✅ Syntax valid`);
  }

  return { valid: true };
}
