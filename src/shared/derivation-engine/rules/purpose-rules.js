
/**
 * @fileoverview Atom Purpose Derivation Rules
 * 
 * Reglas para deducir el propósito de un átomo basándose en su metadata.
 * Esto permite clasificar átomos que no tienen callers pero tienen un propósito válido.
 * 
 * @module derivation-engine/rules/purpose-rules
 * @version 1.0.0
 */

/**
 * Propósitos posibles de un átomo
 */
export const ATOM_PURPOSES = {
  API_EXPORT: {
    name: 'API Export',
    description: 'Exported function - part of public API',
    isDead: false,
    icon: '📤'
  },
  EVENT_HANDLER: {
    name: 'Event Handler',
    description: 'Handles events/lifecycle hooks',
    isDead: false,
    icon: '⚡'
  },
  TEST_HELPER: {
    name: 'Test Helper',
    description: 'Function in test file',
    isDead: false,
    icon: '🧪'
  },
  TIMER_ASYNC: {
    name: 'Timer/Async',
    description: 'Timer callback or async pattern',
    isDead: false,
    icon: '⏱️'
  },
  NETWORK_HANDLER: {
    name: 'Network Handler',
    description: 'Makes network calls',
    isDead: false,
    icon: '🌐'
  },
  INTERNAL_HELPER: {
    name: 'Internal Helper',
    description: 'Helper called within file',
    isDead: false,
    icon: '🔧'
  },
  CONFIG_SETUP: {
    name: 'Config/Setup',
    description: 'Configuration or setup function',
    isDead: false,
    icon: '⚙️'
  },
  SCRIPT_MAIN: {
    name: 'Script Entry',
    description: 'Main function in script',
    isDead: false,
    icon: '🚀'
  },
  CLASS_METHOD: {
    name: 'Class Method',
    description: 'Method in a class (may be called dynamically)',
    isDead: false,
    icon: '📦'
  },
  DEAD_CODE: {
    name: 'Potential Dead Code',
    description: 'No evidence of use - review needed',
    isDead: true,
    icon: '💀'
  }
};

/**
 * Deduce el propósito de un átomo basándose en su metadata
 * @param {Object} atom - El átomo a analizar
 * @param {Map} allAtoms - Todos los átomos del proyecto
 * @param {Map} files - Todos los archivos del proyecto
 * @returns {Object} - Propósito deducido con razón y confianza
 */
export function deduceAtomPurpose(atom, allAtoms, files) {
  const filePath = atom.filePath || '';
  const fileData = files?.get(filePath);
  const culture = fileData?.culture || '';
  
  // Check 1: Is it exported? → API_EXPORT
  if (atom.isExported === true) {
    return {
      purpose: 'API_EXPORT',
      reason: 'Function is exported (public API)',
      confidence: 1.0,
      isDead: false
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
      reason: 'Function in test file',
      confidence: 1.0,
      isDead: false
    };
  }
  
  // Check 3: Is it in scripts/? → SCRIPT_MAIN
  if (filePath.startsWith('scripts/')) {
    return {
      purpose: 'SCRIPT_MAIN',
      reason: 'Function in script file',
      confidence: 0.9,
      isDead: false
    };
  }
  
  // Check 4: Is it a config file? → CONFIG_SETUP
  if (culture === 'laws' || 
      filePath.includes('/config/') || 
      filePath.startsWith('src/config/')) {
    return {
      purpose: 'CONFIG_SETUP',
      reason: 'Function in config/constants file',
      confidence: 0.9,
      isDead: false
    };
  }
  
  // Check 5: Is it a class method? → CLASS_METHOD
  if (atom.functionType === 'class-method' || 
      atom.className || 
      (atom.archetype?.type === 'class-method')) {
    return {
      purpose: 'CLASS_METHOD',
      reason: `Class method${atom.className ? ` in ${atom.className}` : ''}`,
      confidence: 0.85,
      isDead: false
    };
  }
  
  // Check 6: Has lifecycle hooks? → EVENT_HANDLER
  const lifecycleHooks = atom.lifecycleHooks || [];
  const temporal = atom.temporal || {};
  const hasLifecycle = lifecycleHooks.length > 0;
  const hasEventListeners = temporal?.patterns?.events?.length > 0;
  const hasEventEmitters = atom.hasEventEmitters;
  
  if (hasLifecycle || hasEventListeners || hasEventEmitters) {
    return {
      purpose: 'EVENT_HANDLER',
      reason: `Has lifecycle hooks (${lifecycleHooks.length}) or events`,
      confidence: 0.95,
      isDead: false
    };
  }
  
  // Check 7: Has timers? → TIMER_ASYNC
  const timers = temporal?.patterns?.timers || [];
  const asyncPatterns = temporal?.patterns?.asyncPatterns || {};
  const hasTimers = timers.length > 0;
  const isAsync = asyncPatterns?.isAsync || atom.isAsync;
  
  if (hasTimers || (isAsync && atom.hasSideEffects)) {
    return {
      purpose: 'TIMER_ASYNC',
      reason: `Has timers (${timers.length}) or async pattern with side effects`,
      confidence: 0.85,
      isDead: false
    };
  }
  
  // Check 8: Has network calls? → NETWORK_HANDLER
  if (atom.hasNetworkCalls || (atom.networkEndpoints && atom.networkEndpoints.length > 0)) {
    return {
      purpose: 'NETWORK_HANDLER',
      reason: `Has network calls (${atom.networkEndpoints?.length || 0} endpoints)`,
      confidence: 0.9,
      isDead: false
    };
  }
  
  // Check 9: Has DOM manipulation? → EVENT_HANDLER
  if (atom.hasDomManipulation) {
    return {
      purpose: 'EVENT_HANDLER',
      reason: 'Has DOM manipulation (UI handler)',
      confidence: 0.8,
      isDead: false
    };
  }
  
  // Check 10: Check archetype for clues
  const archetype = atom.archetype?.type;
  if (archetype === 'hot-path') {
    return {
      purpose: 'API_EXPORT',
      reason: 'Hot path atom (likely entry point)',
      confidence: 0.8,
      isDead: false
    };
  }
  
  if (archetype === 'validator' || archetype === 'transformer') {
    return {
      purpose: 'INTERNAL_HELPER',
      reason: `${archetype} function`,
      confidence: 0.85,
      isDead: false
    };
  }
  
  // Default: Potential dead code
  return {
    purpose: 'DEAD_CODE',
    reason: 'No evidence of use found in metadata',
    confidence: 0.5,
    isDead: true
  };
}

/**
 * Regla de derivación para usar con el DerivationEngine
 */
export const AtomPurposeRule = {
  name: 'atomPurpose',
  description: 'Deduces the purpose of an atom from its metadata',
  derive: deduceAtomPurpose,
  dependencies: ['archetype', 'isExported', 'filePath', 'temporal', 'lifecycleHooks']
};

export default {
  ATOM_PURPOSES,
  deduceAtomPurpose,
  AtomPurposeRule
};