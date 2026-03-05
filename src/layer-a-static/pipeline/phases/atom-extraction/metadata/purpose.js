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
  WRAPPER: { name: 'Wrapper / Delegate', description: 'Function that delegates to another without logic', isDead: false, icon: '🔄' },
  FACTORY: { name: 'Factory / Builder', description: 'Function that instantiates or constructs objects', isDead: false, icon: '🏭' },
  TIMER_ASYNC: { name: 'Timer/Async', description: 'Timer callback or async pattern', isDead: false, icon: '⏱️' },
  NETWORK_HANDLER: { name: 'Network Handler', description: 'Makes network calls', isDead: false, icon: '🌐' },
  INTERNAL_HELPER: { name: 'Internal Helper', description: 'Helper called within file', isDead: false, icon: '🔧' },
  PRIVATE_HELPER: { name: 'Private Helper', description: 'Private function called only within the same file', isDead: false, icon: '🔒' },
  CONFIG_SETUP: { name: 'Config/Setup', description: 'Configuration or setup function', isDead: false, icon: '⚙️' },
  SCRIPT_MAIN: { name: 'Script Entry', description: 'Main function in script', isDead: false, icon: '🚀' },
  ANALYSIS_SCRIPT: { name: 'Analysis Script', description: 'Audit/analysis script - internal tooling', isDead: false, icon: '🔍', isInternalTool: true },
  CLASS_METHOD: { name: 'Class Method', description: 'Method in a class (may be called dynamically)', isDead: false, icon: '📦' },
  ENTRY_POINT: { name: 'Entry Point', description: 'Application entry point (main, start, etc)', isDead: false, icon: '🚪' },
  WORKER_ENTRY: { name: 'Worker Entry', description: 'Worker or process entry point', isDead: false, icon: '👷' },
  SERVER_HANDLER: { name: 'Server Handler', description: 'HTTP/WebSocket handler', isDead: false, icon: '🌐' },
  POTENTIALLY_UNUSED: { name: 'Potentially Unused', description: 'No evidence of use - may be dead code or dynamically called', isDead: false, icon: '❓' }
};

// ── Private check helpers ─────────────────────────────────────────────────────

function checkExported(atom) {
  if (atom.isExported !== true) return null;
  return { purpose: 'API_EXPORT', purposeReason: 'Function is exported (public API)', purposeConfidence: 1.0, isDeadCode: false };
}

function checkTestFile(filePath) {
  const inTest = filePath.includes('.test.') || filePath.includes('.spec.') ||
    filePath.includes('tests/') || filePath.includes('test-cases/') ||
    filePath.includes('__tests__/');
  if (!inTest) return null;
  return { purpose: 'TEST_HELPER', purposeReason: 'Function in test file', purposeConfidence: 1.0, isDeadCode: false };
}

function checkScript(atom, filePath) {
  if (!filePath.startsWith('scripts/')) return null;
  const analysisPattern = /audit|analyze|check|detect|find|inspect|investigate|scan|validate/i;
  if (analysisPattern.test(filePath) || analysisPattern.test(atom.name)) {
    return { purpose: 'ANALYSIS_SCRIPT', purposeReason: 'Audit/analysis script - internal tooling', purposeConfidence: 0.9, isDeadCode: false };
  }
  return { purpose: 'SCRIPT_MAIN', purposeReason: 'Function in script file', purposeConfidence: 0.9, isDeadCode: false };
}

function checkConfig(filePath) {
  if (!filePath.includes('/config/') && !filePath.startsWith('src/config/')) return null;
  return { purpose: 'CONFIG_SETUP', purposeReason: 'Function in config/constants file', purposeConfidence: 0.9, isDeadCode: false };
}

function checkClassMethod(atom) {
  if (atom.functionType !== 'method' && !atom.className && atom.type !== 'method') return null;
  const where = atom.className ? ` in ${atom.className}` : '';
  return { purpose: 'CLASS_METHOD', purposeReason: `Class method${where}`, purposeConfidence: 0.85, isDeadCode: false };
}

function checkLifecycle(atom) {
  const hasLifecycle = (atom.lifecycleHooks || []).length > 0;
  const hasEvents = (atom.temporal?.patterns?.events || []).length > 0;
  if (!hasLifecycle && !hasEvents) return null;
  return { purpose: 'EVENT_HANDLER', purposeReason: `Has lifecycle hooks (${(atom.lifecycleHooks || []).length}) or events`, purposeConfidence: 0.95, isDeadCode: false };
}

function checkTimerAsync(atom) {
  const hasTimers = (atom.temporal?.patterns?.timers || []).length > 0;
  if (!hasTimers && !(atom.isAsync && atom.hasSideEffects)) return null;
  return { purpose: 'TIMER_ASYNC', purposeReason: `Has timers or async pattern with side effects`, purposeConfidence: 0.85, isDeadCode: false };
}

function checkNetwork(atom) {
  if (!atom.hasNetworkCalls && !(atom.networkEndpoints?.length > 0)) return null;
  return { purpose: 'NETWORK_HANDLER', purposeReason: `Has network calls (${atom.networkEndpoints?.length || 0} endpoints)`, purposeConfidence: 0.9, isDeadCode: false };
}

function checkDom(atom) {
  if (!atom.hasDomManipulation) return null;
  return { purpose: 'EVENT_HANDLER', purposeReason: 'Has DOM manipulation (UI handler)', purposeConfidence: 0.8, isDeadCode: false };
}

function checkArchetype(atom) {
  const archetype = atom.archetype?.type;
  if (archetype === 'hot-path') {
    return { purpose: 'API_EXPORT', purposeReason: 'Hot path atom (likely entry point)', purposeConfidence: 0.8, isDeadCode: false };
  }
  if (archetype === 'validator' || archetype === 'transformer') {
    return { purpose: 'INTERNAL_HELPER', purposeReason: `${archetype} function`, purposeConfidence: 0.85, isDeadCode: false };
  }
  if (atom.className || atom.functionType === 'method' || archetype === 'class-method') {
    const where = atom.className ? ` in ${atom.className}` : '';
    return { purpose: 'CLASS_METHOD', purposeReason: `Class method${where} — called via instance`, purposeConfidence: 0.75, isDeadCode: false };
  }
  return null;
}

function checkWrapperOrFactory(atom) {
  const name = atom.name?.toLowerCase() || '';
  if (name.includes('wrapper') || name.includes('delegate')) {
    return { purpose: 'WRAPPER', purposeReason: 'Function name implies it is a wrapper or delegate', purposeConfidence: 0.9, isDeadCode: false };
  }
  if (name.startsWith('create') || name.startsWith('build') || name.startsWith('make') || name.includes('factory')) {
    return { purpose: 'FACTORY', purposeReason: 'Function name implies it is a factory or builder', purposeConfidence: 0.85, isDeadCode: false };
  }
  // Data flow check for wrapper
  if (atom.linesOfCode <= 4 && atom.calls?.length === 1 && !atom.hasErrorHandling && !atom.hasNetworkCalls && atom.complexity <= 2) {
    if (atom.dataFlow?.transformers?.length === 0) {
      return { purpose: 'WRAPPER', purposeReason: 'Function is very short, calls exactly one external, and has no transformations (Duck Typed Wrapper)', purposeConfidence: 0.8, isDeadCode: false };
    }
  }
  return null;
}

function checkCalledBy(atom) {
  const count = Array.isArray(atom.calledBy) ? atom.calledBy.length : (atom.calledBy || 0);
  if (count <= 0) return null;
  return { purpose: 'INTERNAL_HELPER', purposeReason: `Called by ${count} caller(s) — internal helper`, purposeConfidence: 0.8, isDeadCode: false };
}

function checkEntryPoint(atom, filePath) {
  // Common entry point names
  const entryNames = ['main', 'start', 'run', 'init', 'bootstrap', 'launch'];
  const name = atom.name?.toLowerCase() || '';
  
  // Entry point in server/proxy/worker files
  const isServerFile = filePath.includes('server') || filePath.includes('proxy') || 
                       filePath.includes('worker') || filePath.includes('mcp-') ||
                       filePath.includes('bridge') || filePath.includes('handler');
  
  if (entryNames.includes(name) || (isServerFile && name === 'main')) {
    if (filePath.includes('worker') || filePath.includes('Worker')) {
      return { purpose: 'WORKER_ENTRY', purposeReason: `Worker entry point (${atom.name})`, purposeConfidence: 0.95, isDeadCode: false };
    }
    return { purpose: 'ENTRY_POINT', purposeReason: `Application entry point (${atom.name})`, purposeConfidence: 0.95, isDeadCode: false };
  }
  
  return null;
}

function checkServerHandler(atom, filePath) {
  // Server-related files
  const isServerFile = filePath.includes('server') || filePath.includes('proxy') || 
                       filePath.includes('websocket') || filePath.includes('http') ||
                       filePath.includes('mcp-') || filePath.includes('handler');
  
  if (!isServerFile) return null;
  
  // Handler patterns
  const handlerNames = ['handler', 'request', 'response', 'connection', 'message', 
                        'setup', 'shutdown', 'listen', 'emit', 'broadcast'];
  const name = atom.name?.toLowerCase() || '';
  
  if (handlerNames.some(h => name.includes(h))) {
    return { purpose: 'SERVER_HANDLER', purposeReason: `Server/Handler function (${atom.name})`, purposeConfidence: 0.85, isDeadCode: false };
  }
  
  // Check for lifecycle patterns in the code
  if (atom.hasLifecycleHooks || atom.hasEventHandlers || atom.hasSideEffects) {
    return { purpose: 'SERVER_HANDLER', purposeReason: 'Has lifecycle hooks or event handlers', purposeConfidence: 0.8, isDeadCode: false };
  }
  
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Deduce el propósito de un átomo basándose en su metadata.
 * Runs at extraction time — calledBy may be empty until buildCallGraph().
 * @param {Object} atom - El átomo con metadata ya extraída
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} {purpose, purposeReason, purposeConfidence, isDeadCode}
 */
export function detectAtomPurpose(atom, filePath = '') {
  return (
    checkTestFile(filePath) ||
    checkScript(atom, filePath) ||
    checkConfig(filePath) ||
    checkEntryPoint(atom, filePath) ||
    checkServerHandler(atom, filePath) ||
    checkWrapperOrFactory(atom) ||
    checkExported(atom) ||
    checkClassMethod(atom) ||
    checkLifecycle(atom) ||
    checkTimerAsync(atom) ||
    checkNetwork(atom) ||
    checkDom(atom) ||
    checkArchetype(atom) ||
    checkCalledBy(atom) ||
    { purpose: 'POTENTIALLY_UNUSED', purposeReason: 'No evidence of use found - may be dynamically called or dead code', purposeConfidence: 0.3, isDeadCode: false }
  );
}

/**
 * Re-evaluates purpose for atoms classified as DEAD_CODE after the call graph
 * is built. buildCallGraph() fills calledBy with intra-file callers — so any
 * atom with calledBy > 0 that was tentatively marked DEAD_CODE is PRIVATE_HELPER.
 *
 * Must be called AFTER buildCallGraph().
 * @param {Array} atoms - All atoms from a single file (post call-graph)
 */
export function recalculatePurposes(atoms) {
  for (const atom of atoms) {
    if (atom.purpose !== 'DEAD_CODE') continue;
    if (atom.calledBy?.length > 0) {
      atom.purpose = 'PRIVATE_HELPER';
      atom.purposeReason = `Called by ${atom.calledBy.length} sibling atom(s) within the same file`;
      atom.purposeConfidence = 0.95;
      atom.isDeadCode = false;
    }
  }
}

export default { detectAtomPurpose, recalculatePurposes, ATOM_PURPOSES };
