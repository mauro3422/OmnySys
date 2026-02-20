/**
 * @fileoverview archetype.js
 *
 * Atom archetype detection and recalculation
 *
 * @module pipeline/phases/atom-extraction/metadata/archetype
 */

/**
 * Detect atom archetype based on metadata.
 *
 * Orden de precedencia (mayor severidad gana):
 *   god-function (10) > fragile-network (8) > hot-path (7) >
 *   dead-function (5) > orchestrator (5) > handler (4) >
 *   factory (4) > initializer (4) > transformer (4) > persister (4) >
 *   class-method (3) > private-utility (3) > utility (2) > constant (1) > standard (1)
 *
 * Usa metadata rica: dna.flowType, dna.semanticFingerprint, derived.couplingScore,
 * patrones de nombre, además de los campos clásicos.
 *
 * @param {Object} atomMetadata - Atom metadata
 * @returns {Object} - Archetype with type, severity, and confidence
 */
const TEST_CALLBACK_RE = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\s*\(/;

export function detectAtomArchetype(atomMetadata) {
  const {
    complexity,
    hasSideEffects,
    hasNetworkCalls,
    externalCallCount,
    linesOfCode,
    isExported,
    calledBy,
    className,
    name = '',
    calls = [],
    internalCalls = [],
    dna,
    derived,
    type: atomType,
    functionType
  } = atomMetadata;

  const callerCount = calledBy?.length || 0;
  const isClassMethod = !!className;
  const flowType = dna?.flowType || '';
  const fingerprint = dna?.semanticFingerprint || '';
  const couplingScore = derived?.couplingScore ?? (calls.length + internalCalls.length);
  const nameLow = name.toLowerCase();
  const isTestCallback = TEST_CALLBACK_RE.test(name);

  // ── CRÍTICOS (siempre ganan) ──────────────────────────────────────────────

  // God function: complejidad excesiva o alta complejidad con muchas conexiones
  if (complexity > 50 || linesOfCode > 150 ||
      (complexity > 20 && (externalCallCount > 5 || callerCount > 10))) {
    return { type: 'god-function', severity: 10, confidence: 1.0 };
  }

  // Test callback: invocado por el runner, nunca por código de producción
  // No aplica dead-function ni fragile-network a callbacks de test
  if (isTestCallback) {
    return { type: 'test-callback', severity: 1, confidence: 1.0 };
  }

  // Fragile network: llama red sin manejo de errores
  if (hasNetworkCalls && !atomMetadata.hasErrorHandling) {
    return { type: 'fragile-network', severity: 8, confidence: 0.9 };
  }

  // Hot path: muy usado y eficiente
  if (isExported && callerCount > 5 && complexity < 15) {
    return { type: 'hot-path', severity: 7, confidence: 0.9 };
  }

  // Dead code: no exportada, sin callers, no es método de clase
  if (!isExported && callerCount === 0 && !isClassMethod) {
    return { type: 'dead-function', severity: 5, confidence: 1.0 };
  }

  // ── SEMÁNTICOS (usan metadata rica) ──────────────────────────────────────

  // Orchestrator: alta couplingScore + coordina muchas funciones internas
  // Patrón: función que llama ≥5 otras funciones internas del módulo
  const internalCallCount = internalCalls.length || calls.filter(c => c.type === 'internal').length;
  if (couplingScore >= 6 && internalCallCount >= 4 && isExported) {
    return { type: 'orchestrator', severity: 5, confidence: 0.9 };
  }

  // Handler: maneja eventos/acciones externas
  // Señales: nombre empieza con handle/on/process, o semanticFingerprint contiene "handle:"
  if (fingerprint.startsWith('handle:') ||
      /^(handle|on[A-Z]|process[A-Z])/.test(name) ||
      nameLow.startsWith('handle') || nameLow.startsWith('onerror') ||
      nameLow.startsWith('onchange') || nameLow.startsWith('onfile')) {
    return { type: 'handler', severity: 4, confidence: 0.9 };
  }

  // Factory: crea y retorna objetos/instancias
  // Señales: nombre create*/build*/make*/generate*, o flowType contiene "create"
  if (/^(create|build|make|generate|new|spawn|construct|forge)/.test(nameLow) ||
      flowType.includes('create') || flowType.includes('factory')) {
    return { type: 'factory', severity: 4, confidence: 0.85 };
  }

  // Initializer: configura/arranca sistemas
  // Señales: nombre init*/setup*/start*/bootstrap*/configure*
  if (/^(init|setup|start|bootstrap|configure|register|mount|install|prepare|activate)/.test(nameLow)) {
    return { type: 'initializer', severity: 4, confidence: 0.85 };
  }

  // Transformer: transforma datos sin side effects persistentes
  // Señales: flowType = "read-transform-return", sin side effects, bajo coupling
  if ((flowType === 'read-transform-return' || flowType.includes('transform')) &&
      !hasSideEffects && couplingScore < 5) {
    return { type: 'transformer', severity: 4, confidence: 0.85 };
  }

  // Persister: lee/escribe storage
  // Señales: flowType = "read-persist-return", nombre save*/load*/store*/fetch*/get*
  if (flowType === 'read-persist-return' || flowType.includes('persist') ||
      /^(save|load|store|fetch|get|read|write|persist|cache|retrieve)/.test(nameLow)) {
    // No confundir con utilities puras (sin side effects, sin awaits)
    if (atomMetadata.isAsync || hasSideEffects || flowType.includes('persist')) {
      return { type: 'persister', severity: 4, confidence: 0.8 };
    }
  }

  // ── CLÁSICOS ─────────────────────────────────────────────────────────────

  // Class entry point
  if (isClassMethod && callerCount === 0) {
    return { type: 'class-method', severity: 2, confidence: 1.0 };
  }

  // Private utility
  if (!isExported && callerCount > 0 && !hasSideEffects && complexity < 10) {
    return { type: 'private-utility', severity: 3, confidence: 0.9 };
  }

  // Constant/variable atom
  if (atomType === 'variable' || functionType === 'variable' || functionType === 'arrow') {
    if (linesOfCode <= 3 && complexity <= 1) {
      return { type: 'constant', severity: 1, confidence: 1.0 };
    }
  }

  // Utility: pura, pequeña, sin side effects
  if (!hasSideEffects && complexity < 5 && linesOfCode < 20) {
    return { type: 'utility', severity: 2, confidence: 1.0 };
  }

  return { type: 'standard', severity: 1, confidence: 1.0 };
}

/**
 * Recalculate archetypes for all atoms with calledBy info
 * @param {Array} atoms - Array of atom metadata
 */
export function recalculateArchetypes(atoms) {
  atoms.forEach(atom => {
    atom.archetype = detectAtomArchetype(atom);
  });
}

export default { detectAtomArchetype, recalculateArchetypes };
