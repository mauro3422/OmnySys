/**
 * Network analyzer for suggest-refactoring
 * @module mcp/tools/suggest-refactoring/network-analyzer
 */

function createSuggestion(atom, type, severity, suggestion, reason, benefit) {
  return {
    type,
    severity,
    target: atom.id,
    name: atom.name,
    file: atom.filePath,
    line: atom.line,
    suggestion,
    reason,
    benefit
  };
}

function getCompilerSignals(atom) {
  return {
    testability: atom.compilerEvaluation?.testability,
    semanticPurity: atom.compilerEvaluation?.semanticPurity
  };
}

function buildNetworkDomainSuggestion(atom) {
  const { testability } = getCompilerSignals(atom);
  const testabilityReasons = testability?.reasons || [];
  const testabilitySignals = testability?.signals || {};
  const hasNetworkCalls = Boolean(testabilitySignals.hasNetworkCalls);
  const complexity = testabilitySignals.complexity || 0;

  if (!hasNetworkCalls || !testabilityReasons.includes('high_complexity')) {
    return null;
  }

  return createSuggestion(
    atom,
    'split_network_domain',
    complexity > 25 ? 'high' : 'medium',
    `Complex function (${complexity}) mixed with network calls. Extract domain logic from network adapters.`,
    'Network-bound functions with high complexity are hard to mock and test. Separate the business logic (pure) from the I/O (impure).',
    'Improves testability and prevents network failures from silently breaking domain state.'
  );
}

function buildNetworkErrorHandlingSuggestion(atom) {
  const { testability } = getCompilerSignals(atom);
  const testabilityReasons = testability?.reasons || [];

  if (!testabilityReasons.includes('network_without_error_boundary')) {
    return null;
  }

  return createSuggestion(
    atom,
    'add_network_error_handling',
    'high',
    'Network operations without error handling detected. Add try/catch or .catch() handlers.',
    'Network calls are inherently unpredictable. Missing error handling can crash the daemon or leave sockets hanging.',
    'Prevents daemon crashes and memory leaks from unhandled socket/HTTP errors.'
  );
}

function buildDaemonSafeguardSuggestion(atom) {
  const { testability } = getCompilerSignals(atom);
  const testabilityReasons = testability?.reasons || [];
  const testabilitySignals = testability?.signals || {};

  if (!testabilityReasons.includes('network_without_error_boundary') || !testabilitySignals.isAsync) {
    return null;
  }

  return createSuggestion(
    atom,
    'add_daemon_safeguards',
    'high',
    'Async network call lacks error handling. Add timeout mechanisms and graceful connection teardown.',
    'Async connection drops without error handling cause UnhandledPromiseRejection, crashing the Node.js daemon. It also misses socket timeouts.',
    'Ensures the daemon stays resilient against network latency and drops.'
  );
}

function buildMutableGlobalStateSuggestion(atom) {
  const { semanticPurity } = getCompilerSignals(atom);
  const semanticReasons = semanticPurity?.reasons || [];
  const isVariable = atom.atom_type === 'variable';
  const hasMutableSignals =
    semanticReasons.includes('shared_state_access') ||
    semanticReasons.includes('uses_this_context');
  const atomName = String(atom.name || '');
  const isMutableName = atomName.length > 0 && atomName !== atomName.toUpperCase();

  if (!isVariable || (!isMutableName && !hasMutableSignals)) {
    return null;
  }

  return createSuggestion(
    atom,
    'mutable_global_state',
    'medium',
    `Mutable global variable "${atom.name}" detected. Use a StateManager or wrap in a closure.`,
    'Global mutable state in a daemon causes unpredictable behavior across restarts and makes unit testing nearly impossible.',
    'Ensures deterministic behavior and simplifies debugging of state-related issues.'
  );
}

function buildAsyncEventErrorSuggestion(atom) {
  const { testability } = getCompilerSignals(atom);
  const testabilityReasons = testability?.reasons || [];
  const testabilitySignals = testability?.signals || {};
  const atomName = String(atom.name || '');
  const isAsyncEventListener = testabilitySignals.isAsync && (atomName.startsWith('on') || atomName.includes('Listener'));

  if (!isAsyncEventListener || !testabilityReasons.includes('async_without_error_boundary')) {
    return null;
  }

  return createSuggestion(
    atom,
    'async_event_error_handling',
    'high',
    'Async event listener lacks top-level try/catch.',
    'Async event listeners in Node.js do not propagate errors to the caller. A crash here will trigger an UnhandledPromiseRejection, killing the daemon.',
    'Prevents silent daemon crashes during background event processing.'
  );
}

function normalizeDataFlowString(dataFlowJson) {
  if (!dataFlowJson) {
    return '';
  }

  return typeof dataFlowJson === 'string'
    ? dataFlowJson
    : JSON.stringify(dataFlowJson) || '';
}

function buildUnsafeProcessTerminationSuggestion(atom) {
  const dataFlowStr = normalizeDataFlowString(atom.dataFlowJson);
  if (!dataFlowStr) {
    return null;
  }

  const hasUnsafeTermination =
    dataFlowStr.includes('process.exit') ||
    dataFlowStr.includes('process.kill') ||
    dataFlowStr.includes("'restart'");

  if (!hasUnsafeTermination) {
    return null;
  }

  return createSuggestion(
    atom,
    'unsafe_process_termination',
    'high',
    'Process termination or restart detected. Ensure clients are notified before disconnecting.',
    'Forcefully restarting the daemon or exiting will instantly break all active MCP client sessions yielding [SESSION_EXPIRED] errors.',
    'Allows clients to gracefully detach or pause operations during daemon reloads.'
  );
}

function collectAtomSuggestions(atom) {
  return [
    buildNetworkDomainSuggestion(atom),
    buildNetworkErrorHandlingSuggestion(atom),
    buildDaemonSafeguardSuggestion(atom),
    buildMutableGlobalStateSuggestion(atom),
    buildAsyncEventErrorSuggestion(atom),
    buildUnsafeProcessTerminationSuggestion(atom)
  ].filter(Boolean);
}

/**
 * Analyzes network-related atoms for refactoring opportunities
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzeNetworkConnections(atoms) {
  const suggestions = [];

  for (const atom of atoms) {
    suggestions.push(...collectAtomSuggestions(atom));
  }

  return suggestions;
}
