/**
 * @fileoverview Export Consistency Rule
 * 
 * Valida que los exports registrados coincidan con los exports reales en el código.
 * 
 * @module validation/rules/source/export-consistency
 */

import { ValidationRule } from '../../core/rules/index.js';
import { ValidationResult } from '../../core/results/index.js';

export const ExportConsistencyRule = new ValidationRule({
  id: 'source.export-consistency',
  name: 'Export Consistency',
  description: 'Verifica que los exports registrados existan en el código fuente',
  layer: 'source',
  invariant: false,
  appliesTo: ['file', 'molecule'],
  requires: ['path', 'exports'],
  
  async validate(entity, context) {
    const results = [];
    const sourceCode = await context.getSource(entity.path);
    
    if (!sourceCode) {
      return ValidationResult.invalid(
        entity.id || entity.path,
        'exports',
        'source code available',
        'source code not loaded',
        { severity: 'error' }
      );
    }
    
    for (const exportDef of entity.exports || []) {
      const name = exportDef.name;
      if (!name) continue;
      
      // Buscar el export en el código
      const patterns = [
        new RegExp(`export\\s+(?:default\\s+)?(?:class|function|const|let|var)\\s+${escapeRegex(name)}\\b`),
        new RegExp(`export\\s*\\{[^}]*\\b${escapeRegex(name)}\\b[^}]*\\}`),
        new RegExp(`export\\s+default\\s+(?:class|function)?\\s*${escapeRegex(name)}\\b`)
      ];
      
      const found = patterns.some(pattern => pattern.test(sourceCode));
      
      if (!found) {
        results.push(ValidationResult.invalid(
          entity.id || entity.path,
          `export.${name}`,
          `export '${name}' to exist in source`,
          'export not found in source code',
          {
            details: { 
              exportName: name,
              exportType: exportDef.type,
              patterns: patterns.map(p => p.toString())
            }
          }
        ));
      }
    }
    
    // Si no hay exports registrados pero debería haber
    if ((entity.exports || []).length === 0) {
      // Verificar si hay exports en el código que no registramos
      const hasExports = /\bexport\b/.test(sourceCode);
      if (hasExports) {
        results.push(ValidationResult.warning(
          entity.id || entity.path,
          'exports',
          'File has exports in code but none registered',
          {
            details: { 
              hint: 'File may need re-analysis',
              suggestion: 'Run analysis again to refresh exports'
            }
          }
        ));
      }
    }
    
    return results.length > 0 
      ? results 
      : ValidationResult.valid(entity.id || entity.path, 'exports', {
          message: `All ${entity.exports?.length || 0} exports verified`,
          details: { exportCount: entity.exports?.length || 0 }
        });
  }
});

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default ExportConsistencyRule;
