/**
 * @fileoverview purpose.js
 *
 * Detects the purpose of an atom based on its metadata.
 * This classification helps identify what role each atom plays in the system.
 *
 * @module pipeline/phases/atom-extraction/metadata/purpose
 */

/**
 * Propósitos posibles de un átomo
 */
export const ATOM_PURPOSES = {
  API_EXPORT: { name: 'API Export', description: 'Exported function - part of public API', isDead: false, icon: '📤' },
  EVENT_HANDLER: { name: 'Event Handler', description: 'Handles events/lifecycle hooks', isDead: false, icon: '⚡' },
  TEST_HELPER: { name: 'Test Helper', description: 'Function in test file', isDead: false, icon: '🧪' },
  TIMER_ASYNC: { name: 'Timer/Async', description: 'Timer callback or async pattern', isDead: false, icon: '⏱️' },
  NETWORK_HANDLER: { name: 'Network Handler', description: 'Makes network calls', isDead: false, icon: '🌐' },
  INTERNAL_HELPER: { name: 'Internal Helper', description: 'Helper called within file', isDead: false, icon: '🔧' },
  CONFIG_SETUP: { name: 'Config/Setup', description: 'Configuration or setup function', isDead: false, icon: '⚙️' },
  SCRIPT_MAIN: { name: 'Script Entry', description: 'Main function in script', isDead: false, icon: '🚀' },
  CLASS_METHOD: { name: 'Class Method', description: 'Method in a class (may be called dynamically)', isDead: false, icon: '📦' },
  DEAD_CODE: { name: 'Potential Dead Code', description: 'No evidence of use - review needed', isDead: true, icon: '💀' }
};

/**
 * Deduce el propósito de un átomo basándose en su metadata
 * @param {Object} atom - El átomo con metadata ya extraída
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Información de propósito {purpose, purposeReason, purposeConfidence, isDeadCode}
 */
export function detectAtomPurpose(atom, filePath = '') {
  // Check 1: Is it exported? → API_EXPORT
  if (atom.isExported === true) {
    return {
      purpose: 'API_EXPORT',
      purposeReason: 'Function is exported (public API)',
      purposeConfidence: 1.0,
      isDeadCode: false
    };
  }
  
  // Check 2: Is it in a test file? → TEST_HELPER
  if (filePath.includes('.test.') || 
      filePath.includes('.spec.') || 
      filePath.includes('tests/') ||
      filePath.includes('test-cases/') ||
      filePath.includes('__tests__/')) {
    return {
      purpose: 'TEST_HELPER',
      purposeReason: 'Function in test file',
      purposeConfidence: 1.0,
      isDeadCode: false
    };
  }
  
  // Check 3: Is it in scripts/? → SCRIPT_MAIN
  if (filePath.startsWith('scripts/')) {
    return {
      purpose: 'SCRIPT_MAIN',
      purposeReason: 'Function in script file',
      purposeConfidence: 0.9,
      isDeadCode: false
    };
  }
  
  // Check 4: Is it a config file? → CONFIG_SETUP
  if (filePath.includes('/config/') || filePath.startsWith('src/config/')) {
    return {
      purpose: 'CONFIG_SETUP',
      purposeReason: 'Function in config/constants file',
      purposeConfidence: 0.9,
      isDeadCode: false
    };
  }
  
  // Check 5: Is it a class method? → CLASS_METHOD
  if (atom.functionType === 'method' || atom.className || atom.type === 'method') {
    return {
      purpose: 'CLASS_METHOD',
      purposeReason: `Class method${atom.className ? ` in ${atom.className}` : ''}`,
      purposeConfidence: 0.85,
      isDeadCode: false
    };
  }
  
  // Check 6: Has lifecycle hooks? → EVENT_HANDLER
  const lifecycleHooks = atom.lifecycleHooks || [];
  const temporal = atom.temporal || {};
  const hasLifecycle = lifecycleHooks.length > 0;
  const hasEventListeners = temporal?.patterns?.events?.length > 0;
  
  if (hasLifecycle || hasEventListeners) {
    return {
      purpose: 'EVENT_HANDLER',
      purposeReason: `Has lifecycle hooks (${lifecycleHooks.length}) or events`,
      purposeConfidence: 0.95,
      isDeadCode: false
    };
  }
  
  // Check 7: Has timers? → TIMER_ASYNC
  const timers = temporal?.patterns?.timers || [];
  const hasTimers = timers.length > 0;
  const isAsync = atom.isAsync;
  
  if (hasTimers || (isAsync && atom.hasSideEffects)) {
    return {
      purpose: 'TIMER_ASYNC',
      purposeReason: `Has timers (${timers.length}) or async pattern with side effects`,
      purposeConfidence: 0.85,
      isDeadCode: false
    };
  }
  
  // Check 8: Has network calls? → NETWORK_HANDLER
  if (atom.hasNetworkCalls || (atom.networkEndpoints && atom.networkEndpoints.length > 0)) {
    return {
      purpose: 'NETWORK_HANDLER',
      purposeReason: `Has network calls (${atom.networkEndpoints?.length || 0} endpoints)`,
      purposeConfidence: 0.9,
      isDeadCode: false
    };
  }
  
  // Check 9: Has DOM manipulation? → EVENT_HANDLER
  if (atom.hasDomManipulation) {
    return {
      purpose: 'EVENT_HANDLER',
      purposeReason: 'Has DOM manipulation (UI handler)',
      purposeConfidence: 0.8,
      isDeadCode: false
    };
  }
  
  // Check 10: Check archetype for clues
  const archetype = atom.archetype?.type;
  if (archetype === 'hot-path') {
    return {
      purpose: 'API_EXPORT',
      purposeReason: 'Hot path atom (likely entry point)',
      purposeConfidence: 0.8,
      isDeadCode: false
    };
  }
  if (archetype === 'validator' || archetype === 'transformer') {
    return {
      purpose: 'INTERNAL_HELPER',
      purposeReason: `${archetype} function`,
      purposeConfidence: 0.85,
      isDeadCode: false
    };
  }

  // Check 11: Class methods — called via instance, static analysis no puede
  // trackear `new Clase().method()` sin class instantiation tracker.
  // No marcar DEAD_CODE — usar CLASS_METHOD que ya existe.
  if (atom.className || atom.functionType === 'method' || archetype === 'class-method') {
    return {
      purpose: 'CLASS_METHOD',
      purposeReason: `Class method${atom.className ? ` in ${atom.className}` : ''} — called via instance (static tracker needed)`,
      purposeConfidence: 0.75,
      isDeadCode: false
    };
  }

  // Check final: ¿tiene calledBy registrado? → alguien la llama, no es dead code
  const calledByCount = Array.isArray(atom.calledBy) ? atom.calledBy.length : (atom.calledBy || 0);
  if (calledByCount > 0) {
    return {
      purpose: 'INTERNAL_HELPER',
      purposeReason: `Called by ${calledByCount} caller(s) — internal helper`,
      purposeConfidence: 0.8,
      isDeadCode: false
    };
  }

  // Default: Potential dead code — solo para funciones standalone sin callers
  return {
    purpose: 'DEAD_CODE',
    purposeReason: 'No evidence of use found in metadata',
    purposeConfidence: 0.5,
    isDeadCode: true
  };
}

export default { detectAtomPurpose, ATOM_PURPOSES };