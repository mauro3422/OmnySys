/**
 * @fileoverview Error classifier helpers
 */

import { SEVERITY } from '../patterns/constants.js';

export function buildClassifierPatterns(customPatterns = {}, basePatterns = {}) {
  return { ...basePatterns, ...customPatterns };
}

export function selectMatchingPattern(errorString, patterns) {
  for (const [type, config] of Object.entries(patterns)) {
    const match = errorString.match(config.pattern);
    if (match) {
      return { type, config, match };
    }
  }

  return null;
}

export function buildClassification(error, matchResult) {
  if (matchResult) {
    const { type, config, match } = matchResult;
    return {
      type,
      severity: config.severity,
      autoFixable: config.autoFixable,
      suggestion: config.suggestion(match),
      commonFixes: config.commonFixes || [],
      category: config.category || 'UNKNOWN',
      match: match[0],
      originalError: error
    };
  }

  const errorString = error.stack || error.message || String(error);
  return {
    type: 'UNKNOWN',
    severity: SEVERITY.HIGH,
    autoFixable: false,
    suggestion: 'Error no catalogado. Revisar stack trace completo.',
    commonFixes: [
      'Buscar el error en Google/StackOverflow',
      'Revisar logs completos',
      'Reportar issue con stack trace'
    ],
    category: 'UNKNOWN',
    match: errorString.substring(0, 100),
    originalError: error
  };
}

export function recordClassificationHistory(history, classification) {
  history.push({
    timestamp: new Date().toISOString(),
    type: classification.type,
    severity: classification.severity,
    category: classification.category
  });

  if (history.length > 100) {
    history.shift();
  }
}
