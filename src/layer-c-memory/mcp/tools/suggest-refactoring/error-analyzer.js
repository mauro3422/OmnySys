/**
 * Error handling analyzer
 * @module mcp/tools/suggest-refactoring/error-analyzer
 */

function shouldSkipAtom(atom) {
  const fp = atom.filePath || atom.file || '';

  if (fp.match(/\.(test|spec)\.[jt]sx?$/) || fp.match(/(^|\/)test(s)?\//) || fp.includes('/__tests__/') || fp.match(/(^|\/)factories\//)) {
    return true;
  }

  if (atom.linesOfCode < 4) {
    return true;
  }

  return Boolean(atom.name && (atom.name.startsWith('get') || atom.name.startsWith('set')));
}

function buildErrorHandlingSuggestion(atom, testabilitySignals) {
  const hasNetwork = Boolean(testabilitySignals.hasNetworkCalls);
  const hasFileOps = Boolean(testabilitySignals.hasFileOperations);

  if (!hasNetwork && !hasFileOps) {
    return null;
  }

  return {
    type: 'add_error_handling',
    severity: hasNetwork ? 'high' : 'medium',
    target: atom.id,
    name: atom.name,
    file: atom.filePath,
    line: atom.line,
    suggestion: `Add try/catch for ${hasNetwork ? 'network' : 'file'} operations`,
    reason: hasNetwork ? 'Network calls can fail' : 'File operations can throw',
    currentState: 'No error handling detected'
  };
}

function buildPromiseHandlingSuggestion(atom) {
  return {
    type: 'handle_promises',
    severity: 'medium',
    target: atom.id,
    name: atom.name,
    file: atom.filePath,
    line: atom.line,
    suggestion: 'Either await promises or handle with .catch()',
    reason: 'Unhandled promise rejections can crash the app'
  };
}

/**
 * Sugiere agregar manejo de errores
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzeErrorHandling(atoms) {
  const suggestions = [];

  for (const atom of atoms) {
    if (shouldSkipAtom(atom)) {
      continue;
    }

    const testability = atom.compilerEvaluation?.testability;
    const testabilityReasons = testability?.reasons || [];
    const testabilitySignals = testability?.signals || {};

    if (testabilityReasons.includes('async_without_error_boundary')) {
      const errorHandlingSuggestion = buildErrorHandlingSuggestion(atom, testabilitySignals);
      if (errorHandlingSuggestion) {
        suggestions.push(errorHandlingSuggestion);
      }
    }

    if (testabilityReasons.includes('promise_flow_without_async_boundary')) {
      suggestions.push(buildPromiseHandlingSuggestion(atom));
    }
  }

  return suggestions;
}
