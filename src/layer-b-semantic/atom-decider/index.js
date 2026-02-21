/**
 * @fileoverview atom-decider/index.js
 *
 * Deriva arquetipo de archivo y necesidad de LLM DIRECTAMENTE desde datos de atomos,
 * reemplazando el chain: buildPromptMetadata -> detectArchetypes -> shouldUseLLM
 *
 * EVOLUCION v0.9.37:
 * Los atomos ya contienen `purpose` y `archetype.type` a nivel funcion.
 * Agregar esos datos directamente es mas preciso que re-detectar desde estadisticas.
 *
 * FLUJO ANTERIOR:
 *   atoms -> buildPromptMetadata (pierde granularidad) -> detectArchetypes -> LLM decision
 *
 * FLUJO NUEVO:
 *   atoms.purpose + atoms.archetype -> decideFromAtoms -> LLM decision + fileArchetype
 *
 * @module layer-b-semantic/atom-decider
 * @phase Layer B (Decision Logic)
 */

import {
  checkTestFileGate,
  checkCoverageGate,
  calculateArchetypeCounts,
  deriveFileArchetype,
  checkHighSeverityGate,
  analyzePurposes,
  checkSafePurposesGate,
  checkDeadCodeGate,
  checkConditionalGate,
  checkHighCoverageGate,
  createFallbackDecision
} from './decision-gates.js';

/**
 * Deriva arquetipo de archivo y necesidad de LLM desde datos de atomos.
 *
 * Retorna `decided: false` si los atomos no tienen suficiente cobertura
 * para decidir con confianza — en ese caso el caller debe usar el sistema
 * de deteccion de arquetipos como fallback.
 *
 * @param {Object} fileAnalysis - Analisis completo del archivo (con atoms[])
 * @returns {{
 *   decided: boolean,       // true si se pudo decidir desde atomos
 *   needsLLM: boolean,      // true si necesita LLM
 *   fileArchetype: string|null, // arquetipo derivado de atomos
 *   reason: string          // explicacion de la decision
 * }}
 */
export function decideFromAtoms(fileAnalysis) {
  const atoms = fileAnalysis?.atoms || [];
  const filePath = fileAnalysis?.filePath || '';

  // Gate 0: Quick bypass para archivos type/test
  const testGate = checkTestFileGate(filePath);
  if (testGate) return testGate;

  // Preparar datos
  const atomsWithPurpose = atoms.filter(a => a.purpose);
  const atomsWithArchetype = atoms.filter(a => a.archetype?.type);
  const purposeCoverage = atoms.length > 0 ? atomsWithPurpose.length / atoms.length : 0;

  // Gate 1: Cobertura insuficiente
  const coverageGate = checkCoverageGate(atoms, atomsWithPurpose);
  if (coverageGate) return coverageGate;

  // Calcular arquetipos
  const archetypeCounts = calculateArchetypeCounts(atomsWithArchetype);
  const hasGodFunction = (archetypeCounts['god-function'] || 0) > 0;
  const hasHotPath = (archetypeCounts['hot-path'] || 0) > 0;
  const usedByCount = (fileAnalysis.usedBy || []).length;
  
  const fileArchetype = deriveFileArchetype(archetypeCounts, atoms, atomsWithArchetype, usedByCount);

  // Gate 2: Arquetipos de alta severidad
  const severityGate = checkHighSeverityGate(hasGodFunction, hasHotPath, fileArchetype);
  if (severityGate) return severityGate;

  // Analizar propositos
  const purposeAnalysis = analyzePurposes(atomsWithPurpose);

  // Gate 3: Todos propositos seguros
  const safeGate = checkSafePurposesGate(purposeAnalysis.allSafe, purposeCoverage, fileArchetype);
  if (safeGate) return safeGate;

  // Gate 4: Todo codigo muerto
  const deadGate = checkDeadCodeGate(purposeAnalysis.allDead, fileArchetype);
  if (deadGate) return deadGate;

  // Gate 5: Propositos condicionales
  const conditionalGate = checkConditionalGate(
    purposeAnalysis.hasConditional,
    purposeAnalysis.conditionalPurposes,
    fileAnalysis,
    fileArchetype
  );
  if (conditionalGate) return conditionalGate;

  // Gate 6: Alta cobertura sin riesgo
  const highCoverageGate = checkHighCoverageGate(purposeCoverage, fileArchetype);
  if (highCoverageGate) return highCoverageGate;

  // Fallback
  return createFallbackDecision(fileArchetype);
}
