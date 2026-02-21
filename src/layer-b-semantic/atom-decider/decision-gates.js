/**
 * @fileoverview decision-gates.js
 * 
 * Gates de decision para el atom decider.
 * Cada gate es una funcion independiente que evalua una condicion especifica.
 * 
 * @module layer-b-semantic/atom-decider/decision-gates
 */

/**
 * Propósitos de átomo que NUNCA necesitan LLM
 */
export const NO_LLM_PURPOSES = new Set([
  'TEST_HELPER',
  'CONFIG_SETUP',
  'INTERNAL_HELPER',
  'CLASS_METHOD',
]);

/**
 * Propósitos de átomo que PUEDEN necesitar LLM
 */
export const CONDITIONAL_LLM_PURPOSES = new Set([
  'EVENT_HANDLER',
  'NETWORK_HANDLER',
  'TIMER_ASYNC',
]);

/**
 * Arquetipos de átomo que SIEMPRE justifican LLM
 */
export const LLM_ATOM_ARCHETYPES = new Set(['god-function', 'hot-path']);

/**
 * Mapeo de arquetipo de átomo a arquetipo de archivo
 */
export const ATOM_TO_FILE_ARCHETYPE = {
  'god-function':    'god-object',
  'hot-path':        'critical-bottleneck',
  'fragile-network': 'network-hub',
  'dead-function':   'orphan-module',
};

/**
 * Gate 0: Quick bypass para archivos type/test
 */
export function checkTestFileGate(filePath) {
  if (filePath.endsWith('.d.ts') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/tests/') ||
      filePath.includes('test-cases/') ||
      filePath.includes('__tests__/')) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype: null,
      reason: 'type/test file'
    };
  }
  return null;
}

/**
 * Gate 1: Verificar cobertura de atomos
 */
export function checkCoverageGate(atoms, atomsWithPurpose) {
  const purposeCoverage = atoms.length > 0 ? atomsWithPurpose.length / atoms.length : 0;
  
  if (atoms.length === 0 || purposeCoverage < 0.6) {
    return {
      decided: false,
      fileArchetype: null,
      reason: 'insufficient atom coverage'
    };
  }
  return null;
}

/**
 * Calcula conteos de arquetipos
 */
export function calculateArchetypeCounts(atomsWithArchetype) {
  const counts = {};
  for (const atom of atomsWithArchetype) {
    const t = atom.archetype.type;
    counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

/**
 * Deriva el arquetipo de archivo desde conteos de arquetipos
 */
export function deriveFileArchetype(archetypeCounts, atoms, atomsWithArchetype, usedByCount) {
  const hasGodFunction = (archetypeCounts['god-function'] || 0) > 0;
  const hasHotPath = (archetypeCounts['hot-path'] || 0) > 0;
  const hasFragileNetwork = (archetypeCounts['fragile-network'] || 0) > 0;
  const deadCount = archetypeCounts['dead-function'] || 0;
  const allDead = deadCount > 0 && deadCount === atomsWithArchetype.length && atomsWithArchetype.length === atoms.length;

  if (hasGodFunction)            return 'god-object';
  if (hasHotPath && usedByCount > 5) return 'critical-bottleneck';
  if (hasFragileNetwork)         return 'network-hub';
  if (allDead && usedByCount === 0)  return 'orphan-module';
  
  return null;
}

/**
 * Gate 2: Arquetipos de alta severidad
 */
export function checkHighSeverityGate(hasGodFunction, hasHotPath, fileArchetype) {
  if (hasGodFunction || hasHotPath) {
    return {
      decided: true,
      needsLLM: true,
      fileArchetype,
      reason: `atom archetype: ${hasGodFunction ? 'god-function' : 'hot-path'}`
    };
  }
  return null;
}

/**
 * Analiza propósitos de atomos
 */
export function analyzePurposes(atomsWithPurpose) {
  const purposes = atomsWithPurpose.map(a => a.purpose);
  const allSafe = purposes.every(p => NO_LLM_PURPOSES.has(p));
  const allDead = purposes.every(p => p === 'DEAD_CODE');
  const conditionalPurposes = purposes.filter(p => CONDITIONAL_LLM_PURPOSES.has(p));
  
  return {
    purposes,
    allSafe,
    allDead,
    conditionalPurposes,
    hasConditional: conditionalPurposes.length > 0
  };
}

/**
 * Gate 3: Todos propósitos seguros
 */
export function checkSafePurposesGate(allSafe, purposeCoverage, fileArchetype) {
  if (allSafe && purposeCoverage >= 0.8) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype,
      reason: 'all atoms have safe purposes'
    };
  }
  return null;
}

/**
 * Gate 4: Todo código muerto
 */
export function checkDeadCodeGate(allDead, fileArchetype) {
  if (allDead) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype: fileArchetype || 'orphan-module',
      reason: 'all atoms are dead code'
    };
  }
  return null;
}

/**
 * Gate 5: Propósitos condicionales
 */
export function checkConditionalGate(hasConditional, conditionalPurposes, fileAnalysis, fileArchetype) {
  if (!hasConditional) return null;
  
  const resolvedConnections = (fileAnalysis.semanticConnections || [])
    .filter(c => c.confidence >= 0.8);

  // Si hay suficientes conexiones resueltas
  if (resolvedConnections.length >= conditionalPurposes.length) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype,
      reason: 'conditional purposes resolved by semantic connections'
    };
  }

  return {
    decided: true,
    needsLLM: true,
    fileArchetype,
    reason: `unresolved purposes: ${[...new Set(conditionalPurposes)].join(', ')}`
  };
}

/**
 * Gate 6: Alta cobertura sin señales de riesgo
 */
export function checkHighCoverageGate(purposeCoverage, fileArchetype) {
  if (purposeCoverage >= 0.85) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype,
      reason: 'high purpose coverage, no risk signals'
    };
  }
  return null;
}

/**
 * Fallback: No se puede decidir con confianza
 */
export function createFallbackDecision(fileArchetype) {
  return {
    decided: false,
    fileArchetype,
    reason: 'mixed signals, falling back'
  };
}

export default {
  NO_LLM_PURPOSES,
  CONDITIONAL_LLM_PURPOSES,
  LLM_ATOM_ARCHETYPES,
  ATOM_TO_FILE_ARCHETYPE,
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
};
