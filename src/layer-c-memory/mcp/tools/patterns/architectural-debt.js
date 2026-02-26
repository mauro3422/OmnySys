/**
 * @fileoverview architectural-debt.js
 * Detecta archivos que violan principios SOLID/SSOT
 */

import { isAnalysisScript } from './utils.js';
import { findDuplicates } from './duplicates.js';

/**
 * Analiza violaciones de SOLID en un archivo
 * @param {Object} fileData - Datos del archivo
 * @returns {Object} Violaciones de SOLID
 */
function analyzeSOLID(atoms, fileData) {
  const violations = {
    SRP: null,
    OCP: null,
    DIP: null,
    ISP: null
  };

  const { operations, totalAtoms } = fileData;

  // SRP: Múltiples responsabilidades
  if (fileData.responsibilities.size > 3) {
    violations.SRP = {
      issue: `${fileData.responsibilities.size} responsabilidades distintas`,
      details: [...fileData.responsibilities].slice(0, 5),
      recommendation: 'Separar en módulos por responsabilidad'
    };
  }

  // OCP: Muchas funciones exportadas = difícil de extender
  const exportedCount = atoms.filter(a => a.isExported).length;
  if (exportedCount > 8) {
    violations.OCP = {
      issue: `${exportedCount} funciones exportadas`,
      recommendation: 'Considerar extensiones en lugar de modificaciones'
    };
  }

  // DIP: Dependencias concretas
  const hasExternalDeps = atoms.some(a => a.calls?.length > 5);
  if (hasExternalDeps) {
    violations.DIP = {
      issue: 'Múltiples dependencias externas',
      recommendation: 'Invertir dependencias usando abstracciones'
    };
  }

  return violations;
}

function groupAtomsByFile(atoms) {
  const byFile = new Map();
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (isAnalysisScript(atom)) continue;

    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, {
        atoms: [],
        totalLines: 0,
        responsibilities: new Set(),
        hasDuplicates: false,
        maxComplexity: 0,
        operations: new Set(),
        globalWrites: new Set()
      });
    }

    const fileData = byFile.get(atom.filePath);
    fileData.atoms.push(atom);
    fileData.totalLines = Math.max(fileData.totalLines, atom.endLine || atom.line || 0);
    fileData.maxComplexity = Math.max(fileData.maxComplexity, atom.complexity || 0);

    if (atom.dna?.flowType) fileData.responsibilities.add(atom.dna.flowType);
    if (atom.purpose) fileData.responsibilities.add(atom.purpose);
    if (atom.archetype?.type) fileData.responsibilities.add(atom.archetype.type);

    if (atom.sharedStateAccess) {
      for (const access of atom.sharedStateAccess) {
        if (access.type === 'write' && (access.scope === 'global' || access.scope === 'module')) {
          fileData.globalWrites.add(access.variable);
        }
      }
    }
  }
  return byFile;
}

function getFilesWithDuplicates(atoms) {
  const duplicates = findDuplicates(atoms, 2);
  const filesWithDuplicates = new Set();
  duplicates.exactDuplicates.forEach(dup => {
    dup.atoms.forEach(atom => {
      if (atom.file) filesWithDuplicates.add(atom.file);
    });
  });
  return filesWithDuplicates;
}

function calculateDebtScore(lines, responsibilities, hasDuplicates, maxComplexity, fileData) {
  return (
    (lines > 250 ? 20 : 0) +
    (responsibilities > 3 ? responsibilities * 10 : 0) +
    (hasDuplicates ? 15 : 0) +
    (maxComplexity > 30 ? (maxComplexity - 30) * 2 : 0) +
    (fileData.globalWrites.size > 5 ? fileData.globalWrites.size * 5 : 0)
  );
}

function formatDebtWarnings(lines, responsibilities, hasDuplicates, maxComplexity, fileData) {
  const violations = [];
  if (lines > 250) violations.push(`Archivo muy grande (${lines} líneas)`);
  if (responsibilities > 3) violations.push(`${responsibilities} responsabilidades distintas`);
  if (hasDuplicates) violations.push('Contiene código duplicado');
  if (maxComplexity > 30) violations.push(`Complejidad máxima ${maxComplexity}`);
  if (fileData.globalWrites.size > 5) violations.push(`Densidad de estado alta (${fileData.globalWrites.size} mutaciones globales)`);
  return violations;
}

function evaluateDebtFiles(byFile, filesWithDuplicates) {
  const debtFiles = [];

  for (const [filePath, fileData] of byFile) {
    const lines = fileData.totalLines;
    const responsibilities = fileData.responsibilities.size;
    const hasDuplicates = filesWithDuplicates.has(filePath);
    const maxComplexity = fileData.maxComplexity;

    const hasTooManyLines = lines > 250;
    const hasTooManyResponsibilities = responsibilities > 3;
    const hasHighComplexity = maxComplexity > 30;
    const hasHighStateDensity = fileData.globalWrites.size > 5;

    if (hasTooManyLines && (hasTooManyResponsibilities || hasDuplicates || hasHighComplexity || hasHighStateDensity)) {
      const violations = formatDebtWarnings(lines, responsibilities, hasDuplicates, maxComplexity, fileData);
      const debtScore = calculateDebtScore(lines, responsibilities, hasDuplicates, maxComplexity, fileData);

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
        solidViolations: analyzeSOLID(fileData.atoms, {
          ...fileData,
          totalAtoms: fileData.atoms.length
        }),
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
  return debtFiles;
}

/**
 * Detecta deuda arquitectónica (archivos que violan SOLID/SSOT)
 * Se activa cuando: >250 líneas AND (múltiples responsabilidades OR duplicados OR complejidad alta)
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Archivos con deuda arquitectónica
 */
export function findArchitecturalDebt(atoms) {
  const byFile = groupAtomsByFile(atoms);
  const filesWithDuplicates = getFilesWithDuplicates(atoms);
  const debtFiles = evaluateDebtFiles(byFile, filesWithDuplicates);

  return debtFiles.sort((a, b) => b.debtScore - a.debtScore).slice(0, 15);
}
