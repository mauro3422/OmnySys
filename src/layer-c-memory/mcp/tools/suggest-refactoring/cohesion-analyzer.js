/**
 * Cohesion analyzer
 * @module mcp/tools/suggest-refactoring/cohesion-analyzer
 */

/**
 * Sugiere mejorar la cohesión
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzeCohesion(atoms) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Funciones que hacen demasiadas cosas diferentes
    if (atom.calls && atom.calls.length > 20) {
      const uniqueTypes = new Set(atom.calls.map(c => c.type));
      if (uniqueTypes.size >= 4) {
        suggestions.push({
          type: 'improve_cohesion',
          severity: 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: 'Split into focused functions by operation type',
          reason: `Function mixes ${uniqueTypes.size} different concerns`,
          callTypes: Array.from(uniqueTypes)
        });
      }
    }
  }
  
  return suggestions;
}
