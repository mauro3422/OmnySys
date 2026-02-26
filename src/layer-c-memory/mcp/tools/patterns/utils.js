/**
 * @fileoverview utils.js
 * Funciones utilitarias compartidas entre los detectores de patrones
 */

/**
 * Clasificadores de átomos para filtrado y análisis
 */
export const AtomClassifiers = {
  /**
   * Verifica por archetypes técnicos que suelen ser falsos positivos de dead code
   */
  isTechnicalArchetype: (atom) => {
    const archetype = atom.archetype?.type;
    const technical = [
      'detector', 'strategy', 'validator', 'handler', 'middleware',
      'normalizer', 'transformer', 'parser', 'formatter', 'factory',
      'builder', 'utility'
    ];
    return technical.includes(archetype);
  },

  /**
   * Verifica si el nombre sigue patrones de callbacks o eventos
   */
  isCallbackOrEvent: (atom) => {
    const name = atom.name || '';
    return name.startsWith('on') || name.startsWith('handle');
  },

  /**
   * Verifica si es una constante o variable que puede usarse dinámicamente
   */
  isConstantOrVariable: (atom) => {
    const type = atom.type || atom.functionType;
    const name = atom.name || '';
    return type === 'variable' || type === 'constant' ||
      name === name.toUpperCase() ||
      (name.startsWith('_') && !name.includes('('));
  },

  /**
   * Verifica si es un método de clase (que puede llamarse dinámicamente)
   */
  isClassMethod: (atom) => {
    return atom.className || atom.archetype?.type === 'class-method' || atom.name === 'constructor';
  },

  /**
   * Verifica si es un átomo de test
   */
  isTest: (atom) => {
    return atom.isTestCallback || atom.testCallbackType ||
      isTestFile(atom.filePath);
  }
};

/**
 * Verifica si un átomo es un script de análisis (herramienta interna)
 * @param {Object} atom - Átomo a verificar
 * @returns {boolean} true si es un script de análisis
 */
export function isAnalysisScript(atom) {
  return atom.purpose === 'ANALYSIS_SCRIPT' ||
    atom.filePath?.startsWith('scripts/') ||
    atom.filePath?.includes('/scripts/');
}

/**
 * Verifica si un archivo es un archivo de test
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean} true si es un archivo de test
 */
export function isTestFile(filePath) {
  if (!filePath) return false;
  const path = filePath.toLowerCase();
  return path.includes('.test.') ||
    path.includes('.spec.') ||
    path.includes('__tests__') ||
    path.includes('/tests/') ||
    path.includes('/test/') ||
    path.includes('/factories/');
}

/**
 * Genera recomendación para una god function
 */
export function getGodFunctionRecommendation(atom) {
  const recommendations = [];

  if (atom.complexity > 20) {
    recommendations.push('Break into smaller functions. Extract logical blocks to separate functions');
  }

  if (atom.linesOfCode > 100) {
    recommendations.push('Function is too long. Consider extracting helper functions');
  }

  if (atom.calls?.length > 15) {
    recommendations.push('Too many function calls. Consider using a dispatcher pattern');
  }

  return recommendations.join('. ') || 'Consider refactoring for better maintainability';
}
