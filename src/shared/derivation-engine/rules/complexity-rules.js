/**
 * @fileoverview Complexity Derivation Rules
 * 
 * Reglas para derivar métricas de complejidad desde átomos.
 * 
 * @module derivation-engine/rules/complexity-rules
 * @version 1.0.0
 */

/**
 * Complejidad molecular = suma de complejidades atómicas
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Total complexity
 */
export function moleculeComplexity(atoms) {
  return atoms.reduce((sum, atom) => sum + (atom.complexity || 0), 0);
}

/**
 * Riesgo molecular = máximo riesgo atómico
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Max severity score
 */
export function moleculeRisk(atoms) {
  if (atoms.length === 0) return 0;
  return Math.max(...atoms.map(a => a.archetype?.severity || 0));
}

/**
 * Complejidad cognitiva molecular
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Cognitive complexity
 */
export function moleculeCognitiveComplexity(atoms) {
  return atoms.reduce((sum, atom) => 
    sum + (atom.cognitiveComplexity || atom.complexity || 0), 0
  );
}

/**
 * Complejidad ciclomática molecular
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Cyclomatic complexity
 */
export function moleculeCyclomaticComplexity(atoms) {
  return atoms.reduce((sum, atom) => 
    sum + (atom.cyclomaticComplexity || 1), 0
  );
}

/**
 * Calcula estadísticas de complejidad
 * @param {Array} atoms - Functions in the file
 * @returns {Object} - Statistics
 */
export function calculateComplexityStats(atoms) {
  if (atoms.length === 0) {
    return {
      total: 0,
      average: 0,
      max: 0,
      min: 0
    };
  }

  const complexities = atoms.map(a => a.complexity || 0);
  const total = complexities.reduce((a, b) => a + b, 0);
  
  return {
    total,
    average: total / atoms.length,
    max: Math.max(...complexities),
    min: Math.min(...complexities)
  };
}

/**
 * Clasifica la complejidad de la molécula
 * @param {number} complexity - Complejidad total
 * @returns {string} - Clasificación
 */
export function classifyComplexity(complexity) {
  if (complexity <= 10) return 'low';
  if (complexity <= 30) return 'medium';
  if (complexity <= 50) return 'high';
  return 'critical';
}
