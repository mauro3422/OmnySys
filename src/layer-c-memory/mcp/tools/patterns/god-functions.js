/**
 * @fileoverview god-functions.js
 * Detecta funciones demasiado grandes y complejas (god functions)
 */

import { isAnalysisScript, getGodFunctionRecommendation } from './utils.js';

/**
 * Encuentra god functions en el código
 * @param {Array} atoms - Lista de átomos
 * @param {number} threshold - Umbral de complejidad (default: 15)
 * @param {boolean} excludeInternalTools - Excluir herramientas internas
 * @returns {Array} Lista de god functions ordenadas por complejidad
 */
export function findGodFunctions(atoms, threshold = 15, excludeInternalTools = true) {
  const filtered = atoms.filter(a => {
    if ((a.complexity || 0) < threshold) return false;
    
    // Skip internal analysis scripts unless explicitly included
    if (excludeInternalTools && isAnalysisScript(a)) {
      return false;
    }
    
    return true;
  });
  
  return filtered
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      line: a.line,
      complexity: a.complexity,
      calls: a.calls?.length || 0,
      calledBy: a.calledBy?.length || 0,
      linesOfCode: a.linesOfCode,
      bigO: a.performance?.complexity?.bigO,
      flowType: a.dna?.flowType,
      purpose: a.purpose,
      recommendation: getGodFunctionRecommendation(a)
    }))
    .sort((a, b) => b.complexity - a.complexity);
}
