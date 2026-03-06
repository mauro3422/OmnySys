/**
 * @fileoverview Canonical atom evaluation helpers for compiler/runtime consumers.
 *
 * Centralizes lightweight testability and semantic-purity evaluation so MCP
 * tools, watcher guards and reports can reuse one shared contract instead of
 * rebuilding heuristics inline from atom metadata.
 *
 * @module shared/compiler/atom-evaluation
 */

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSeverity(score) {
  if (score <= 34) return 'high';
  if (score <= 69) return 'medium';
  return 'low';
}

function normalizeCalls(atom = {}) {
  return Array.isArray(atom.calls) ? atom.calls : [];
}

function hasFileOperations(atom = {}) {
  return normalizeCalls(atom).some((call) => /readFile|writeFile|appendFile|mkdir|rm|unlink/i.test(call?.name || ''));
}

function hasPromiseCalls(atom = {}) {
  return normalizeCalls(atom).some((call) => call?.type === 'promise' || String(call?.name || '').includes('Promise'));
}

function getSemanticSnapshot(atom = {}) {
  return atom.semantic || atom.derived?.semantic?.semantic || {};
}

export function evaluateAtomTestability(atom = {}) {
  const linesOfCode = atom.linesOfCode || atom.lines_of_code || 0;
  const complexity = atom.complexity || 0;
  const hasNetworkCalls = Boolean(atom.hasNetworkCalls);
  const hasErrorHandling = Boolean(atom.hasErrorHandling);
  const isAsync = Boolean(atom.isAsync);
  const isExported = Boolean(atom.isExported);
  const fileOperations = hasFileOperations(atom);
  const promiseCalls = hasPromiseCalls(atom);

  const reasons = [];
  let score = 100;

  if (complexity > 15) {
    score -= complexity > 25 ? 30 : 18;
    reasons.push('high_complexity');
  }

  if (linesOfCode > 100) {
    score -= linesOfCode > 200 ? 24 : 12;
    reasons.push('long_function');
  }

  if (isExported && complexity > 12) {
    score -= 10;
    reasons.push('complex_exported_api');
  }

  if (hasNetworkCalls && !hasErrorHandling) {
    score -= 28;
    reasons.push('network_without_error_boundary');
  }

  if (fileOperations && !hasErrorHandling) {
    score -= 16;
    reasons.push('file_io_without_error_boundary');
  }

  if (isAsync && !hasErrorHandling) {
    score -= 14;
    reasons.push('async_without_error_boundary');
  }

  if (promiseCalls && !isAsync) {
    score -= 8;
    reasons.push('promise_flow_without_async_boundary');
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    severity: buildSeverity(finalScore),
    reasons,
    signals: {
      complexity,
      linesOfCode,
      isExported,
      isAsync,
      hasNetworkCalls,
      hasFileOperations: fileOperations,
      hasErrorHandling,
      hasPromiseCalls: promiseCalls
    }
  };
}

export function evaluateAtomSemanticPurity(atom = {}) {
  const semantic = getSemanticSnapshot(atom);
  const mutatesParams = Array.isArray(semantic.mutatesParams) ? semantic.mutatesParams : [];
  const usesThisContext = Boolean(semantic.usesThisContext);
  const hasReturnValue = Boolean(semantic.hasReturnValue);
  const hasNetworkCalls = Boolean(atom.hasNetworkCalls);
  const sharedStateAccess = Array.isArray(atom.sharedStateAccess) ? atom.sharedStateAccess : [];
  const eventEmitters = Array.isArray(atom.eventEmitters) ? atom.eventEmitters : [];
  const eventListeners = Array.isArray(atom.eventListeners) ? atom.eventListeners : [];
  const isDeclaredPure = semantic.isPure === true;

  const reasons = [];
  let score = 100;

  if (mutatesParams.length > 0) {
    score -= 30;
    reasons.push('mutates_params');
  }

  if (usesThisContext) {
    score -= 18;
    reasons.push('uses_this_context');
  }

  if (hasNetworkCalls) {
    score -= 30;
    reasons.push('network_side_effects');
  }

  if (sharedStateAccess.length > 0) {
    score -= 24;
    reasons.push('shared_state_access');
  }

  if (eventEmitters.length > 0 || eventListeners.length > 0) {
    score -= 16;
    reasons.push('event_side_effects');
  }

  if (!hasReturnValue && !isDeclaredPure) {
    score -= 8;
    reasons.push('missing_return_contract');
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    severity: buildSeverity(finalScore),
    reasons,
    semantic: {
      isPure: reasons.length === 0 || isDeclaredPure,
      mutatesParams,
      usesThisContext,
      hasReturnValue
    },
    signals: {
      hasNetworkCalls,
      sharedStateAccessCount: sharedStateAccess.length,
      eventEmitterCount: eventEmitters.length,
      eventListenerCount: eventListeners.length
    }
  };
}

export function evaluateAtomRefactoringSignals(atom = {}) {
  return {
    testability: evaluateAtomTestability(atom),
    semanticPurity: evaluateAtomSemanticPurity(atom)
  };
}
