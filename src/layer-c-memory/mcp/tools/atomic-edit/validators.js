/**
 * @fileoverview Validaciones pre y post edit
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { checkImportExists } from '../validate-imports.js';
import { extractImportsFromCode } from './exports.js';
import { findCallersEfficient } from './search.js';

const logger = createLogger('OmnySys:atomic:validators');

/**
 * Valida que todos los imports en el nuevo código existan
 */
export async function validateImportsInEdit(filePath, newString, projectPath) {
  const imports = extractImportsFromCode(newString);
  const brokenImports = [];
  
  for (const importPath of imports) {
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
 * Valida post-edit de forma OPTIMIZADA
 * Solo analiza callers de funciones modificadas
 */
export async function validatePostEditOptimized(filePath, projectPath, previousAtoms, currentAtoms) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    brokenCallers: [],
    affectedFiles: 0,
    debugInfo: {
      currentAtomsCount: currentAtoms.length,
      previousAtomsCount: previousAtoms.length,
      atoms: []
    }
  };
  
  try {
    const modifiedAtoms = currentAtoms.filter(current => {
      const previous = previousAtoms.find(p => p.name === current.name);
      if (!previous) return false;
      
      const currentRequired = (current.signature?.params || []).filter(p => !p.optional).length;
      const previousRequired = (previous.signature?.params || []).filter(p => !p.optional).length;
      
      return currentRequired !== previousRequired;
    });
    
    if (modifiedAtoms.length === 0) {
      logger.info('[PostEditOptimized] No signature changes detected');
      return result;
    }
    
    logger.info(`[PostEditOptimized] Checking ${modifiedAtoms.length} modified functions`);
    
    for (const atom of modifiedAtoms) {
      const requiredParams = (atom.signature?.params || []).filter(p => !p.optional).length;
      
      const callers = await findCallersEfficient(atom.name, projectPath, filePath);
      
      logger.info(`[PostEditOptimized] ${atom.name}: ${callers.length} callers found`);
      
      for (const caller of callers) {
        if (caller.argumentCount !== undefined && caller.argumentCount < requiredParams) {
          result.valid = false;
          result.brokenCallers.push({
            caller: caller.name,
            file: caller.filePath,
            line: caller.line,
            reason: `Passes ${caller.argumentCount} args but ${atom.name} requires ${requiredParams}`,
            severity: 'critical'
          });
        }
      }
    }
    
    result.affectedFiles = new Set(result.brokenCallers.map(c => c.file)).size;
    
  } catch (error) {
    logger.error(`[PostEditOptimized] Error: ${error.message}`);
    result.errors.push(`Validation error: ${error.message}`);
  }
  
  return result;
}


