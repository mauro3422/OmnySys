/**
 * @fileoverview archetype-patterns.js
 * Encuentra patrones basados en arquetipos de funciones
 */

/**
 * Encuentra patrones basados en arquetipos
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Patrones agrupados por arquetipo
 */
export function findByArchetypePattern(atoms) {
  const byArchetype = new Map();
  
  for (const atom of atoms) {
    const archetype = atom.dna?.archetype || atom.archetype?.type || 'unknown';
    
    if (!byArchetype.has(archetype)) {
      byArchetype.set(archetype, []);
    }
    
    byArchetype.get(archetype).push({
      id: atom.id,
      name: atom.name,
      file: atom.filePath,
      complexity: atom.complexity,
      flowType: atom.dna?.flowType
    });
  }
  
  const patterns = [];
  for (const [archetype, atomsList] of byArchetype) {
    if (atomsList.length >= 3) {
      patterns.push({
        archetype,
        count: atomsList.length,
        avgComplexity: Math.round(
          atomsList.reduce((sum, a) => sum + (a.complexity || 0), 0) / atomsList.length * 10
        ) / 10,
        examples: atomsList.slice(0, 5)
      });
    }
  }
  
  return patterns.sort((a, b) => b.count - a.count);
}
