/**
 * @fileoverview architectural-debt.js
 * Detecta archivos que violan principios SOLID/SSOT
 */

import { isAnalysisScript } from './utils.js';
import { findDuplicates } from './duplicates.js';

/**
 * Detecta deuda arquitectónica (archivos que violan SOLID/SSOT)
 * Se activa cuando: >250 líneas AND (múltiples responsabilidades OR duplicados OR complejidad alta)
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Archivos con deuda arquitectónica
 */
export function findArchitecturalDebt(atoms) {
  const debtFiles = [];
  
  // Agrupar átomos por archivo
  const byFile = new Map();
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (isAnalysisScript(atom)) continue; // Ignorar scripts de análisis
    
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, {
        atoms: [],
        totalLines: 0,
        responsibilities: new Set(),
        hasDuplicates: false,
        maxComplexity: 0
      });
    }
    
    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalLines += atom.linesOfCode || 0;
    fileData.maxComplexity = Math.max(fileData.maxComplexity, atom.complexity || 0);
    
    // Detectar responsabilidades por flowType
    if (atom.dna?.flowType) {
      fileData.responsibilities.add(atom.dna.flowType);
    }
    
    // Detectar por propósito/archetype
    if (atom.purpose) {
      fileData.responsibilities.add(atom.purpose);
    }
    if (atom.archetype?.type) {
      fileData.responsibilities.add(atom.archetype.type);
    }
  }
  
  // Detectar duplicados por archivo
  const duplicates = findDuplicates(atoms, 2);
  const filesWithDuplicates = new Set();
  duplicates.exactDuplicates.forEach(dup => {
    dup.atoms.forEach(atom => {
      if (atom.file) filesWithDuplicates.add(atom.file);
    });
  });
  
  // Evaluar cada archivo
  for (const [filePath, fileData] of byFile) {
    const lines = fileData.totalLines;
    const responsibilities = fileData.responsibilities.size;
    const hasDuplicates = filesWithDuplicates.has(filePath);
    const maxComplexity = fileData.maxComplexity;
    
    // Criterios de deuda arquitectónica
    const hasTooManyLines = lines > 250;
    const hasTooManyResponsibilities = responsibilities > 3;
    const hasHighComplexity = maxComplexity > 30;
    
    // Se activa si cumple: líneas grandes AND (responsabilidades múltiples OR duplicados OR complejidad alta)
    if (hasTooManyLines && (hasTooManyResponsibilities || hasDuplicates || hasHighComplexity)) {
      const violations = [];
      if (hasTooManyLines) violations.push(`Archivo muy grande (${lines} líneas)`);
      if (hasTooManyResponsibilities) violations.push(`${responsibilities} responsabilidades distintas`);
      if (hasDuplicates) violations.push('Contiene código duplicado');
      if (hasHighComplexity) violations.push(`Complejidad máxima ${maxComplexity}`);
      
      // Calcular score de deuda
      const debtScore = (
        (lines > 250 ? 20 : 0) +
        (responsibilities > 3 ? responsibilities * 10 : 0) +
        (hasDuplicates ? 15 : 0) +
        (maxComplexity > 30 ? (maxComplexity - 30) * 2 : 0)
      );
      
      debtFiles.push({
        file: filePath,
        lines,
        atomCount: fileData.atoms.length,
        responsibilities: [...fileData.responsibilities].slice(0, 5),
        responsibilityCount: responsibilities,
        maxComplexity,
        hasDuplicates,
        violations,
        debtScore,
        severity: debtScore > 60 ? 'critical' : (debtScore > 40 ? 'high' : 'medium'),
        topAtoms: fileData.atoms
          .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
          .slice(0, 3)
          .map(a => ({
            name: a.name,
            complexity: a.complexity,
            linesOfCode: a.linesOfCode,
            purpose: a.purpose
          })),
        recommendation: `Dividir en módulos más pequeños (< 250 líneas). ${violations.join('. ')}`
      });
    }
  }
  
  return debtFiles.sort((a, b) => b.debtScore - a.debtScore).slice(0, 15);
}
