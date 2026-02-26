/**
 * @fileoverview Métricas y agrupamiento para detección de monolitos
 */

import { isAnalysisScript, isTestFile } from '../utils.js';

/**
 * Agrupa átomos por archivo y recolecta métricas base
 */
export function gatherFileMetrics(atoms) {
  const byFile = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (isAnalysisScript(atom)) continue;
    if (isTestFile(atom.filePath)) continue;
    
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, {
        atoms: [],
        totalLines: 0,
        flowTypes: new Map(),
        purposes: new Map(),
        archetypes: new Map(),
        operations: new Set(),
        functionNames: new Set()
      });
    }
    
    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalLines = Math.max(fileData.totalLines, atom.endLine || atom.line || 0);
    
    updateMappings(fileData, atom);
  }
  
  return byFile;
}

function updateMappings(fileData, atom) {
  if (atom.dna?.flowType) {
    const count = (fileData.flowTypes.get(atom.dna.flowType) || 0) + 1;
    fileData.flowTypes.set(atom.dna.flowType, count);
  }
  
  if (atom.purpose) {
    const count = (fileData.purposes.get(atom.purpose) || 0) + 1;
    fileData.purposes.set(atom.purpose, count);
  }
  
  if (atom.archetype?.type) {
    const count = (fileData.archetypes.get(atom.archetype.type) || 0) + 1;
    fileData.archetypes.set(atom.archetype.type, count);
  }
}

/**
 * Obtiene el valor dominante y su porcentaje
 */
export function getDominant(map) {
  if (!map || map.size === 0) return null;
  
  let maxEntry = null;
  let maxCount = 0;
  let total = 0;
  
  for (const [key, count] of map) {
    total += count;
    if (count > maxCount) {
      maxCount = count;
      maxEntry = key;
    }
  }
  
  return {
    value: maxEntry,
    count: maxCount,
    pct: Math.round((maxCount / total) * 100)
  };
}
