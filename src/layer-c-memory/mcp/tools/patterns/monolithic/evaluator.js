/**
 * @fileoverview Lógica de evaluación para detectar archivos monolíticos
 */

import { getDominant } from './metrics.js';
import { analyzeSOLIDViolations } from './solid.js';

export function evaluateFile(filePath, fileData) {
  const lines = fileData.totalLines;
  if (lines <= 250) return null;
  
  const totalAtoms = fileData.atoms.length;
  const dominantFlowType = getDominant(fileData.flowTypes);
  const dominantPurpose = getDominant(fileData.purposes);
  const dominantArchetype = getDominant(fileData.archetypes);
  
  const hasSingleDominantPurpose = (
    (dominantFlowType && dominantFlowType.pct >= 80) ||
    (dominantPurpose && dominantPurpose.pct >= 80) ||
    (dominantArchetype && dominantArchetype.pct >= 80)
  );
  
  if (!hasSingleDominantPurpose) return null;

  const operationCount = fileData.operations.size;
  const uniqueOps = [...fileData.operations];
  
  return {
    file: filePath,
    lines,
    atomCount: totalAtoms,
    dominantFlowType: dominantFlowType?.value || null,
    dominantPurpose: dominantPurpose?.value || null,
    dominantArchetype: dominantArchetype?.value || null,
    operationCount,
    operations: uniqueOps.slice(0, 10),
    violations: [
      `Archivo grande (${lines} líneas) con propósito único: ${dominantPurpose?.value || dominantArchetype?.value || 'unknown'}`,
      `Pero realiza ${operationCount} operaciones técnicas distintas`,
      `Possible SRP violation: un archivo con un dominio pero múltiples responsabilidades técnicas`
    ],
    solidViolations: analyzeSOLIDViolations(fileData),
    severity: lines > 400 ? 'critical' : (lines > 300 ? 'high' : 'medium'),
    recommendation: generateMonolithicRecommendation(fileData, lines, uniqueOps)
  };
}

function generateMonolithicRecommendation(fileData, lines, operations) {
  const ops = operations.slice(0, 5);
  const opsText = ops.length > 0 ? ops.join(', ') : 'múltiples operaciones';
  
  return [
    `Archivo de ${lines} líneas con un solo propósito de dominio pero múltiples responsabilidades técnicas.`,
    `Opera con: ${opsText}${operations.length > 5 ? '...' : ''}`,
    'Considera aplicar SRP: separar operaciones técnicas en módulos distintos.',
    'Ejemplo: un archivo "system-map.js" que save/load/files/deps/connections/risk/issues → dividir en storage/handlers/parsers/'
  ].join(' ');
}
