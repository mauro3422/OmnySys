/**
 * @fileoverview Export Usage Rule
 * 
 * Valida que las funciones exportadas tengan usos (usedBy).
 * Detecta exports potencialmente muertos.
 * 
 * @module validation/rules/semantic/export-usage
 */

import { ValidationRule } from '../../core/rules/index.js';
import { ValidationResult } from '../../core/results/index.js';

export const ExportUsageRule = new ValidationRule({
  id: 'semantic.export-usage',
  name: 'Export Usage Check',
  description: 'Detecta exports que no son usados por ningún otro archivo',
  layer: 'semantic',
  invariant: false, // No es un error, solo una advertencia
  appliesTo: ['file', 'molecule'],
  requires: ['exports', 'usedBy'],
  
  async validate(entity, context) {
    const exports = entity.exports || [];
    const usedBy = entity.usedBy || [];
    
    const unusedExports = [];
    
    for (const exp of exports) {
      const name = typeof exp === 'string' ? exp : exp.name;
      if (!name) continue;
      
      // Verificar si este export específico es usado
      // Nota: En la estructura actual no tenemos granularidad de qué export se usa,
      // solo sabemos que el archivo es usado. Esto es una simplificación.
    }
    
    // Por ahora, verificamos si el archivo tiene exports pero no es usado
    if (exports.length > 0 && usedBy.length === 0) {
      return ValidationResult.warning(
        entity.id || entity.path,
        'exports.usage',
        `File has ${exports.length} export(s) but is not imported by any other file`,
        {
          details: {
            exportCount: exports.length,
            exports: exports.map(e => typeof e === 'string' ? e : e.name),
            suggestion: 'This might be dead code or an entry point'
          }
        }
      );
    }
    
    // Verificar uso de cada export si tenemos información detallada
    const detailedExports = exports.filter(e => typeof e === 'object' && e.name);
    const unusedDetailed = detailedExports.filter(exp => {
      // Verificar si hay imports que referencien este export específico
      // Esto requeriría información más detallada de los imports
      return false; // Por ahora asumimos que están usados
    });
    
    if (unusedDetailed.length > 0) {
      return ValidationResult.warning(
        entity.id || entity.path,
        'exports.specific-usage',
        `${unusedDetailed.length} export(s) may be unused`,
        {
          details: {
            unusedExports: unusedDetailed.map(e => e.name)
          }
        }
      );
    }
    
    return ValidationResult.valid(entity.id || entity.path, 'exports.usage', {
      message: usedBy.length > 0 
        ? `File is imported by ${usedBy.length} other file(s)`
        : 'No exports or exports are used',
      details: {
        exportCount: exports.length,
        usedByCount: usedBy.length
      }
    });
  }
});

export default ExportUsageRule;
