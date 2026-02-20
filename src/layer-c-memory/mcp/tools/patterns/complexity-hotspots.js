/**
 * @fileoverview complexity-hotspots.js
 * Encuentra archivos con alta complejidad acumulada
 */

import { isAnalysisScript } from './utils.js';

/**
 * Encuentra hotspots de complejidad por archivo
 * @param {Array} atoms - Lista de átomos
 * @param {boolean} excludeInternalTools - Excluir herramientas internas
 * @returns {Array} Archivos ordenados por complejidad total
 */
export function findComplexityHotspots(atoms, excludeInternalTools = true) {
  const byFile = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    
    // Skip internal analysis scripts
    if (excludeInternalTools && isAnalysisScript(atom)) {
      continue;
    }
    
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, { atoms: [], totalComplexity: 0, totalLOC: 0 });
    }
    
    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalComplexity += atom.complexity || 0;
    fileData.totalLOC += atom.linesOfCode || 0;
  }
  
  const hotspots = [];
  for (const [file, data] of byFile) {
    if (data.totalComplexity >= 50) {
      hotspots.push({
        file,
        atomCount: data.atoms.length,
        totalComplexity: data.totalComplexity,
        totalLOC: data.totalLOC,
        avgComplexity: Math.round(data.totalComplexity / data.atoms.length * 10) / 10,
        topAtoms: data.atoms
          .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
          .slice(0, 3)
          .map(a => ({ name: a.name, complexity: a.complexity }))
      });
    }
  }
  
  return hotspots.sort((a, b) => b.totalComplexity - a.totalComplexity).slice(0, 10);
}
