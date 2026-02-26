/**
 * @fileoverview findLargeMonolithic - Versión Modularizada
 */

import { gatherFileMetrics } from './metrics.js';
import { inferOperations } from './helpers.js';
import { evaluateFile } from './evaluator.js';

/**
 * Detecta archivos monolíticos grandes
 */
export function findLargeMonolithic(atoms) {
  const monolithicFiles = [];
  
  // 1. Recolectar métricas agrupadas por archivo
  const byFile = gatherFileMetrics(atoms);
  
  // 2. Enriquecer con operaciones técnicas inferidas
  for (const [filePath, fileData] of byFile) {
    for (const atom of fileData.atoms) {
      if (atom.dna?.operations) {
        for (const op of atom.dna.operations) {
          fileData.operations.add(op);
        }
      }
      
      if (atom.name) {
        const inferredOps = inferOperations(atom.name, atom.calls || []);
        for (const op of inferredOps) {
          fileData.operations.add(op);
        }
      }
    }
  }
  
  // 3. Evaluar rasgos monolíticos
  for (const [filePath, fileData] of byFile) {
    const report = evaluateFile(filePath, fileData);
    if (report) {
      monolithicFiles.push(report);
    }
  }
  
  return monolithicFiles.sort((a, b) => b.lines - a.lines).slice(0, 15);
}
