/**
 * @fileoverview File Existence Rule
 * 
 * Valida que el archivo fuente exista en el proyecto.
 * Regla fundamental - si falla, todo el análisis de este archivo es inválido.
 * 
 * @module validation/rules/source/file-existence
 */

import { ValidationRule } from '../../core/rules/index.js';
import { ValidationResult } from '../../core/results/index.js';
import fs from 'fs/promises';

export const FileExistenceRule = new ValidationRule({
  id: 'source.file-existence',
  name: 'File Existence',
  description: 'Verifica que el archivo fuente exista en el proyecto',
  layer: 'source',
  invariant: false, // No es crítica - archivos stale son comunes durante desarrollo
  appliesTo: ['file', 'molecule'],
  requires: ['path'],
  
  async validate(entity, context) {
    const filePath = entity.path;
    
    try {
      const fullPath = new URL(filePath, `file://${context.projectPath}/`).pathname.slice(1);
      await fs.access(fullPath);
      
      return ValidationResult.valid(entity.id || filePath, 'file-existence', {
        message: 'File exists',
        details: { path: filePath }
      });
    } catch (error) {
      return ValidationResult.invalid(
        entity.id || filePath,
        'file-existence',
        'file to exist',
        'file not found',
        {
          severity: 'warning', // Warning en lugar de crítico
          message: `Source file not found: ${filePath}`,
          details: { 
            path: filePath,
            projectPath: context.projectPath,
            error: error.message,
            suggestion: 'File may have been deleted or moved. Run re-analysis.'
          }
        }
      );
    }
  }
});

export default FileExistenceRule;
