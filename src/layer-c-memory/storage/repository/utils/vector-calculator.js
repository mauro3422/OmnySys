import { calculateTemporalVectors, calculateStability } from './calculators/temporal-calculator.js';
import {
  calculateLinesOfCode,
  calculateCohesion,
  calculateCoupling,
  calculateDependencyDepth
} from './calculators/structural-calculator.js';
import {
  calculateImportance,
  calculatePropagation,
  calculateFragility,
  calculateTestability,
  calculateArchetypeWeight
} from './calculators/semantic-calculator.js';
import { calculateCompatibility } from './calculators/compatibility-calculator.js';
import { calculateRenameImpact, calculateMoveImpact } from './calculators/impact-calculator.js';

/**
 * Calcula vectores matematicos para atomos.
 * Actúa como Facade para los calculadores especializados.
 * 
 * @module storage/repository/utils/vector-calculator
 */

/**
 * Calcula todos los vectores matematicos de un atomo
 * @param {Object} atom - Atomo base
 * @param {Object} context - Contexto adicional (callers, callees, git history)
 * @returns {Object} Vectores calculados
 */
export function calculateAtomVectors(atom, context = {}) {
  const {
    gitHistory = null
  } = context;

  // 1. Vectores temporales
  const temporal = calculateTemporalVectors(atom);
  const ageDays = gitHistory?.ageDays ?? temporal.ageDays;
  const changeFrequency = gitHistory?.changeFrequency ?? temporal.changeFrequency;

  // 2. Vectores estructurales
  const linesOfCode = calculateLinesOfCode(atom);
  const cohesionScore = calculateCohesion(atom);
  const couplingScore = calculateCoupling(atom, context);
  const dependencyDepth = calculateDependencyDepth(atom);

  // 3. Resultado final con delegación
  return {
    // ESTRUCTURALES
    linesOfCode,
    parameterCount: atom.signature?.params?.length || 0,

    // RELACIONALES
    callersCount: (context.callers || []).length,
    calleesCount: (context.callees || []).length,
    dependencyDepth,
    externalCallCount: atom.externalCalls?.length || 0,

    // SEMÁNTICOS / MÉTRICAS
    archetypeWeight: calculateArchetypeWeight(atom),
    cohesionScore,
    couplingScore,

    // TEMPORALES
    changeFrequency,
    ageDays,

    // ALGEBRA DE GRAFOS / DERIVADOS
    importance: calculateImportance(atom, context),
    stability: calculateStability(atom, gitHistory),
    propagationScore: calculatePropagation(atom, context),
    fragilityScore: calculateFragility(atom, context),
    testabilityScore: calculateTestability(atom, context)
  };
}

// Re-exports para mantener compatibilidad con herramientas que consumen funciones específicas
export {
  calculateLinesOfCode,
  calculateArchetypeWeight,
  calculateCohesion,
  calculateCoupling,
  calculateImportance,
  calculateStability,
  calculatePropagation,
  calculateCompatibility,
  calculateRenameImpact,
  calculateMoveImpact
};