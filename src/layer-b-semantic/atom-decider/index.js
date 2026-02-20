/**
 * @fileoverview atom-decider/index.js
 *
 * Deriva arquetipo de archivo y necesidad de LLM DIRECTAMENTE desde datos de átomos,
 * reemplazando el chain: buildPromptMetadata → detectArchetypes → shouldUseLLM
 *
 * EVOLUCIÓN v0.9.37:
 * Los átomos ya contienen `purpose` y `archetype.type` a nivel función.
 * Agregar esos datos directamente es más preciso que re-detectar desde estadísticas.
 *
 * FLUJO ANTERIOR:
 *   atoms → buildPromptMetadata (pierde granularidad) → detectArchetypes → LLM decision
 *
 * FLUJO NUEVO:
 *   atoms.purpose + atoms.archetype → decideFromAtoms → LLM decision + fileArchetype
 *
 * @module layer-b-semantic/atom-decider
 * @phase Layer B (Decision Logic)
 */

/**
 * Propósitos de átomo que NUNCA necesitan LLM.
 * Son determinísticos desde el análisis estático.
 */
const NO_LLM_PURPOSES = new Set([
  'TEST_HELPER',    // Archivos de test - nunca necesitan enriquecimiento
  'CONFIG_SETUP',   // Config/constantes - determinístico
  'INTERNAL_HELPER',// Helper interno - bien cubierto por calls
  'CLASS_METHOD',   // Método de clase - semántica clara
]);

/**
 * Propósitos de átomo que PUEDEN necesitar LLM si hay conexiones no resueltas.
 * El LLM puede descubrir consumidores ocultos vía eventos, globals, localStorage.
 */
const CONDITIONAL_LLM_PURPOSES = new Set([
  'EVENT_HANDLER',    // Listeners - puede haber emisores sin resolver
  'NETWORK_HANDLER',  // Network - puede haber consumidores de respuesta sin resolver
  'TIMER_ASYNC',      // Async/timer - patrones de side effects
]);

/**
 * Arquetipos de átomo que SIEMPRE justifican LLM (alta complejidad oculta).
 */
const LLM_ATOM_ARCHETYPES = new Set(['god-function', 'hot-path']);

/**
 * Mapeo de arquetipo de átomo → arquetipo de archivo.
 * Cuando el arquetipo más frecuente en átomos es este → archivo hereda el arquetipo.
 */
const ATOM_TO_FILE_ARCHETYPE = {
  'god-function':    'god-object',
  'hot-path':        'critical-bottleneck',
  'fragile-network': 'network-hub',
  'dead-function':   'orphan-module',
};

/**
 * Deriva arquetipo de archivo y necesidad de LLM desde datos de átomos.
 *
 * Retorna `decided: false` si los átomos no tienen suficiente cobertura
 * para decidir con confianza — en ese caso el caller debe usar el sistema
 * de detección de arquetipos como fallback.
 *
 * @param {Object} fileAnalysis - Análisis completo del archivo (con atoms[])
 * @returns {{
 *   decided: boolean,       // true si se pudo decidir desde átomos
 *   needsLLM: boolean,      // true si necesita LLM
 *   fileArchetype: string|null, // arquetipo derivado de átomos
 *   reason: string          // explicación de la decisión
 * }}
 */
export function decideFromAtoms(fileAnalysis) {
  const atoms = fileAnalysis?.atoms || [];
  const filePath = fileAnalysis?.filePath || '';

  // --- Gate 0: Quick bypass para archivos type/test ---
  if (filePath.endsWith('.d.ts') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/tests/') ||
      filePath.includes('test-cases/') ||
      filePath.includes('__tests__/')) {
    return { decided: true, needsLLM: false, fileArchetype: null, reason: 'type/test file' };
  }

  // Necesitamos átomos con datos de purpose y archetype para decidir
  const atomsWithPurpose = atoms.filter(a => a.purpose);
  const atomsWithArchetype = atoms.filter(a => a.archetype?.type);
  const purposeCoverage = atoms.length > 0 ? atomsWithPurpose.length / atoms.length : 0;

  // --- Gate 1: Cobertura insuficiente → fallback ---
  if (atoms.length === 0 || purposeCoverage < 0.6) {
    return { decided: false, fileArchetype: null, reason: 'insufficient atom coverage' };
  }

  // --- Agregar arquetipos de átomos ---
  const archetypeCounts = {};
  for (const atom of atomsWithArchetype) {
    const t = atom.archetype.type;
    archetypeCounts[t] = (archetypeCounts[t] || 0) + 1;
  }

  const hasGodFunction = (archetypeCounts['god-function'] || 0) > 0;
  const hasHotPath = (archetypeCounts['hot-path'] || 0) > 0;
  const hasFragileNetwork = (archetypeCounts['fragile-network'] || 0) > 0;
  const deadCount = archetypeCounts['dead-function'] || 0;
  const allDead = deadCount > 0 && deadCount === atomsWithArchetype.length && atomsWithArchetype.length === atoms.length;

  // --- Derivar arquetipo de archivo desde arquetipos de átomos ---
  let fileArchetype = null;
  const usedByCount = (fileAnalysis.usedBy || []).length;

  if (hasGodFunction)            fileArchetype = 'god-object';
  else if (hasHotPath && usedByCount > 5) fileArchetype = 'critical-bottleneck';
  else if (hasFragileNetwork)    fileArchetype = 'network-hub';
  else if (allDead && usedByCount === 0)  fileArchetype = 'orphan-module';

  // --- Gate 2: Arquetipos de átomo de alta severidad → siempre LLM ---
  if (hasGodFunction || hasHotPath) {
    return {
      decided: true,
      needsLLM: true,
      fileArchetype,
      reason: `atom archetype: ${hasGodFunction ? 'god-function' : 'hot-path'}`
    };
  }

  // --- Agregar propósitos de átomos ---
  const purposes = atomsWithPurpose.map(a => a.purpose);
  const allSafe = purposes.every(p => NO_LLM_PURPOSES.has(p));
  const allDead2 = purposes.every(p => p === 'DEAD_CODE');
  const conditionalPurposes = purposes.filter(p => CONDITIONAL_LLM_PURPOSES.has(p));
  const hasConditional = conditionalPurposes.length > 0;

  // --- Gate 3: Todos propósitos seguros → sin LLM ---
  if (allSafe && purposeCoverage >= 0.8) {
    return { decided: true, needsLLM: false, fileArchetype, reason: 'all atoms have safe purposes' };
  }

  // --- Gate 4: Todo código muerto → sin LLM ---
  if (allDead2) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype: fileArchetype || 'orphan-module',
      reason: 'all atoms are dead code'
    };
  }

  // --- Gate 5: Propósitos condicionales → verificar si conexiones semánticas los resuelven ---
  if (hasConditional) {
    const resolvedConnections = (fileAnalysis.semanticConnections || [])
      .filter(c => c.confidence >= 0.8);

    // Si hay suficientes conexiones resueltas → estática es suficiente
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

  // --- Gate 6: Alta cobertura sin señales de riesgo → sin LLM ---
  if (purposeCoverage >= 0.85) {
    return {
      decided: true,
      needsLLM: false,
      fileArchetype,
      reason: 'high purpose coverage, no risk signals'
    };
  }

  // No se puede decidir con confianza desde átomos → fallback
  return { decided: false, fileArchetype, reason: 'mixed signals, falling back' };
}
