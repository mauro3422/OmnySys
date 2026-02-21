/**
 * @fileoverview archetype-rules.js
 *
 * Reglas de detección de arquetipos de átomos.
 * Centraliza la lógica de clasificación para facilitar mantenimiento.
 *
 * @module pipeline/phases/atom-extraction/metadata/archetype-rules
 */

const TEST_CALLBACK_RE = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\s*\(/;

/**
 * Detecta si es un test callback
 */
export function isTestCallback(atomMetadata) {
  return atomMetadata.isTestCallback === true || TEST_CALLBACK_RE.test(atomMetadata.name || '');
}

/**
 * Detecta god-function
 */
export function detectGodFunction(atomMetadata) {
  const { complexity, linesOfCode, externalCallCount, calledBy } = atomMetadata;
  const callerCount = calledBy?.length || 0;
  
  if (complexity > 50 || linesOfCode > 150 ||
      (complexity > 20 && (externalCallCount > 5 || callerCount > 10))) {
    return { type: 'god-function', severity: 10, confidence: 1.0 };
  }
  return null;
}

/**
 * Detecta fragile-network
 */
export function detectFragileNetwork(atomMetadata) {
  if (atomMetadata.hasNetworkCalls && !atomMetadata.hasErrorHandling) {
    return { type: 'fragile-network', severity: 8, confidence: 0.9 };
  }
  return null;
}

/**
 * Detecta hot-path
 */
export function detectHotPath(atomMetadata) {
  const { isExported, calledBy, complexity } = atomMetadata;
  const callerCount = calledBy?.length || 0;
  
  if (isExported && callerCount > 5 && complexity < 15) {
    return { type: 'hot-path', severity: 7, confidence: 0.9 };
  }
  return null;
}

/**
 * Detecta dead-function
 */
export function detectDeadFunction(atomMetadata) {
  const { isExported, calledBy, className } = atomMetadata;
  const callerCount = calledBy?.length || 0;
  const isClassMethod = !!className;
  
  if (!isExported && callerCount === 0 && !isClassMethod) {
    return { type: 'dead-function', severity: 5, confidence: 1.0 };
  }
  return null;
}

/**
 * Detecta orchestrator
 */
export function detectOrchestrator(atomMetadata) {
  const { calls = [], internalCalls = [], isExported, derived } = atomMetadata;
  const couplingScore = derived?.couplingScore ?? (calls.length + internalCalls.length);
  const internalCallCount = internalCalls.length || calls.filter(c => c.type === 'internal').length;
  
  if (couplingScore >= 6 && internalCallCount >= 4 && isExported) {
    return { type: 'orchestrator', severity: 5, confidence: 0.9 };
  }
  return null;
}

/**
 * Detecta handler
 */
export function detectHandler(atomMetadata) {
  const { name = '', dna } = atomMetadata;
  const fingerprint = dna?.semanticFingerprint || '';
  const nameLow = name.toLowerCase();
  
  if (fingerprint.startsWith('handle:') ||
      /^(handle|on[A-Z]|process[A-Z])/.test(name) ||
      nameLow.startsWith('handle') || nameLow.startsWith('onerror') ||
      nameLow.startsWith('onchange') || nameLow.startsWith('onfile')) {
    return { type: 'handler', severity: 4, confidence: 0.9 };
  }
  return null;
}

/**
 * Detecta factory
 */
export function detectFactory(atomMetadata) {
  const { name = '', dna } = atomMetadata;
  const flowType = dna?.flowType || '';
  const nameLow = name.toLowerCase();
  
  if (/^(create|build|make|generate|new|spawn|construct|forge)/.test(nameLow) ||
      flowType.includes('create') || flowType.includes('factory')) {
    return { type: 'factory', severity: 4, confidence: 0.85 };
  }
  return null;
}

/**
 * Detecta initializer
 */
export function detectInitializer(atomMetadata) {
  const nameLow = (atomMetadata.name || '').toLowerCase();
  
  if (/^(init|setup|start|bootstrap|configure|register|mount|install|prepare|activate)/.test(nameLow)) {
    return { type: 'initializer', severity: 4, confidence: 0.85 };
  }
  return null;
}

/**
 * Detecta transformer
 */
export function detectTransformer(atomMetadata) {
  const { hasSideEffects, dna, derived, calls = [], internalCalls = [] } = atomMetadata;
  const flowType = dna?.flowType || '';
  const couplingScore = derived?.couplingScore ?? (calls.length + internalCalls.length);
  
  if ((flowType === 'read-transform-return' || flowType.includes('transform')) &&
      !hasSideEffects && couplingScore < 5) {
    return { type: 'transformer', severity: 4, confidence: 0.85 };
  }
  return null;
}

/**
 * Detecta persister
 */
export function detectPersister(atomMetadata) {
  const { name = '', hasSideEffects, isAsync, dna } = atomMetadata;
  const flowType = dna?.flowType || '';
  const nameLow = name.toLowerCase();
  
  if (flowType === 'read-persist-return' || flowType.includes('persist') ||
      /^(save|load|store|fetch|get|read|write|persist|cache|retrieve)/.test(nameLow)) {
    if (isAsync || hasSideEffects || flowType.includes('persist')) {
      return { type: 'persister', severity: 4, confidence: 0.8 };
    }
  }
  return null;
}

/**
 * Detecta class-method
 */
export function detectClassMethod(atomMetadata) {
  const { className, calledBy } = atomMetadata;
  const callerCount = calledBy?.length || 0;
  
  if (className && callerCount === 0) {
    return { type: 'class-method', severity: 2, confidence: 1.0 };
  }
  return null;
}

/**
 * Detecta private-utility
 */
export function detectPrivateUtility(atomMetadata) {
  const { isExported, calledBy, hasSideEffects, complexity } = atomMetadata;
  const callerCount = calledBy?.length || 0;
  
  if (!isExported && callerCount > 0 && !hasSideEffects && complexity < 10) {
    return { type: 'private-utility', severity: 3, confidence: 0.9 };
  }
  return null;
}

/**
 * Detecta constant
 */
export function detectConstant(atomMetadata) {
  const { type: atomType, functionType, linesOfCode, complexity } = atomMetadata;
  
  if ((atomType === 'variable' || functionType === 'variable' || functionType === 'arrow') &&
      linesOfCode <= 3 && complexity <= 1) {
    return { type: 'constant', severity: 1, confidence: 1.0 };
  }
  return null;
}

/**
 * Detecta utility
 */
export function detectUtility(atomMetadata) {
  const { hasSideEffects, complexity, linesOfCode } = atomMetadata;
  
  if (!hasSideEffects && complexity < 5 && linesOfCode < 20) {
    return { type: 'utility', severity: 2, confidence: 1.0 };
  }
  return null;
}

/**
 * Orden de precedencia de detectores (mayor severidad primero)
 */
export const ARCHETYPE_DETECTORS = [
  detectGodFunction,      // severity: 10
  isTestCallback,         // severity: 1 (pero es crítico)
  detectFragileNetwork,   // severity: 8
  detectHotPath,          // severity: 7
  detectDeadFunction,     // severity: 5
  detectOrchestrator,     // severity: 5
  detectHandler,          // severity: 4
  detectFactory,          // severity: 4
  detectInitializer,      // severity: 4
  detectTransformer,      // severity: 4
  detectPersister,        // severity: 4
  detectClassMethod,      // severity: 2
  detectPrivateUtility,   // severity: 3
  detectConstant,         // severity: 1
  detectUtility,          // severity: 2
];

export default {
  ARCHETYPE_DETECTORS,
  isTestCallback,
  detectGodFunction,
  detectFragileNetwork,
  detectHotPath,
  detectDeadFunction,
  detectOrchestrator,
  detectHandler,
  detectFactory,
  detectInitializer,
  detectTransformer,
  detectPersister,
  detectClassMethod,
  detectPrivateUtility,
  detectConstant,
  detectUtility,
};
