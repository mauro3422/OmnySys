/**
 * @fileoverview Side Effect Classifier
 * 
 * Clasifica side effects en llamadas a función.
 * 
 * @module data-flow/output-extractor/classifiers/side-effect-classifier
 * @version 1.0.0
 */

/**
 * Determina si una llamada tiene side effects
 * @param {string} calleeName - Nombre de la función llamada
 * @returns {boolean}
 */
export function isSideEffectCall(calleeName) {
  if (!calleeName) return false;

  const sideEffectPatterns = [
    // Console
    /^console\./,
    // Storage
    /^localStorage\./,
    /^sessionStorage\./,
    // Fetch/HTTP
    /^fetch$/,
    /^(get|post|put|delete|patch)$/,
    // DB
    /\.(save|create|update|delete|insert|remove|destroy)$/,
    // DOM
    /^(document\.write|document\.append|document\.insert)/,
    // React/Vue state
    /^(setState|forceUpdate|dispatch)$/,
    /\.(setState|commit|dispatch|emit)$/,
    // Event emitters
    /\.(emit|broadcast)$/,
    // File system
    /fs\./,
    // Process
    /process\.exit/
  ];

  if (sideEffectPatterns.some(pattern => pattern.test(calleeName))) {
    return true;
  }

  // Métodos mutantes de arrays
  if (calleeName.includes('.')) {
    const methodName = calleeName.split('.').pop();
    const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 
                             'sort', 'reverse', 'fill', 'copyWithin'];
    if (mutatingMethods.includes(methodName)) {
      return true;
    }
  }

  return false;
}

/**
 * Clasifica el tipo de side effect
 * @param {string} calleeName - Nombre de la función
 * @returns {string}
 */
export function classifySideEffect(calleeName) {
  if (!calleeName) return 'unknown';

  if (calleeName.startsWith('console.')) return 'logging';
  if (calleeName.startsWith('localStorage.') || calleeName.startsWith('sessionStorage.')) return 'storage';
  if (calleeName === 'fetch' || /^(get|post|put|delete|patch)$/.test(calleeName)) return 'network';
  if (/\.(save|create|update|delete|insert|remove|destroy)$/.test(calleeName)) return 'persistence';
  if (/\.(emit|broadcast)$/.test(calleeName)) return 'event_emission';
  if (/\.(setState|commit|dispatch)$/.test(calleeName)) return 'state_mutation';
  if (/\.write/.test(calleeName) || /\.append/.test(calleeName)) return 'io';

  return 'unknown';
}

export default { isSideEffectCall, classifySideEffect };
