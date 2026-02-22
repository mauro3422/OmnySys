/**
 * @fileoverview unusual-patterns.js
 * Detecta patrones inusuales como exports no usados
 */

import { isTestCallback, isAnalysisScript, isDynamicallyUsed } from '../../core/analysis-checker/utils/script-classifier.js';

// Alias para mantener compatibilidad
const isTestRelated = isTestCallback;
const isDynamicallyUsedExport = isDynamicallyUsed;

/**
 * Encuentra patrones inusuales en el código
 * @param {Array} atoms - Lista de átomos
 * @returns {Object} Patrones inusuales encontrados
 */
export function findUnusualPatterns(atoms) {
  const patterns = {
    unusedExports: [],
    highComplexityPrivate: [],
    longFunctions: []
  };
  
  for (const atom of atoms) {
    // 🧪 FIX 1: Skip test callbacks y scripts de análisis
    if (isTestRelated(atom)) continue;
    if (isAnalysisScript(atom)) continue;
    
    // Unused exports: exported but never called
    if (atom.isExported && (!atom.calledBy || atom.calledBy.length === 0)) {
      // 🔄 FIX 2: Skip dynamically used exports
      if (isDynamicallyUsedExport(atom)) continue;
      
      patterns.unusedExports.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        reason: 'Exported but never called'
      });
    }
    
    // High complexity private functions
    // 🧪 FIX 3: Ajustar umbral para tests
    const complexityThreshold = isTestRelated(atom) ? 50 : 20;
    if (!atom.isExported && atom.complexity > complexityThreshold) {
      patterns.highComplexityPrivate.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        complexity: atom.complexity,
        reason: 'High complexity in private function'
      });
    }
    
    // Very long functions
    // 🧪 FIX 4: Ajustar umbral para tests
    const linesThreshold = isTestRelated(atom) ? 300 : 100;
    if (atom.linesOfCode > linesThreshold) {
      patterns.longFunctions.push({
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        linesOfCode: atom.linesOfCode,
        reason: 'Function exceeds 100 lines'
      });
    }
  }
  
  return patterns;
}
