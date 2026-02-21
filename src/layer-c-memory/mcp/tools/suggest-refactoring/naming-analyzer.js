/**
 * Naming analyzer
 * @module mcp/tools/suggest-refactoring/naming-analyzer
 */

import { generateBetterName, POOR_NAME_PATTERNS } from './naming-helpers.js';

/**
 * Sugiere renombrar variables/funciones con nombres poco claros
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzeNaming(atoms) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Verificar nombre de función
    for (const { pattern, reason } of POOR_NAME_PATTERNS) {
      if (pattern.test(atom.name)) {
        suggestions.push({
          type: 'rename',
          severity: 'low',
          target: atom.id,
          currentName: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: `Consider more descriptive name`,
          reason: reason,
          suggestedName: generateBetterName(atom)
        });
        break;
      }
    }
    
    // Verificar parámetros
    if (atom.dataFlow?.inputs) {
      for (const input of atom.dataFlow.inputs) {
        for (const { pattern, reason } of POOR_NAME_PATTERNS) {
          if (pattern.test(input.name)) {
            suggestions.push({
              type: 'rename_parameter',
              severity: 'low',
              target: atom.id,
              functionName: atom.name,
              currentName: input.name,
              file: atom.filePath,
              line: atom.line,
              suggestion: `Rename parameter to be more descriptive`,
              reason: reason,
              context: `Parameter in ${atom.name}()`
            });
            break;
          }
        }
      }
    }
  }
  
  return suggestions;
}
