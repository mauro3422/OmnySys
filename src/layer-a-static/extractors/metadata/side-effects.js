/**
 * @fileoverview side-effects.js
 *
 * Side Effects Extractor - Detects I/O, network, DOM, storage operations
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/side-effects
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts side effect patterns from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Categorized side effects
 */
export function extractSideEffects(code) {
  const networkCalls = [];
  const domManipulations = [];
  const storageAccess = [];
  const consoleUsage = [];
  const timerUsage = [];

  // Network calls patterns
  const networkPatterns = [
    { pattern: /fetch\s*\(/g, type: 'fetch' },
    { pattern: /axios\.(get|post|put|delete|patch|request)\s*\(/g, type: 'axios' },
    { pattern: /new\s+XMLHttpRequest\s*\(/g, type: 'xhr' },
    { pattern: /\$\.(get|post|ajax)\s*\(/g, type: 'jquery' }
  ];

  for (const { pattern, type } of networkPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      networkCalls.push({
        type,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // DOM manipulation patterns
  const domPatterns = [
    { pattern: /document\.(getElementById|querySelector|querySelectorAll|createElement|write)\s*\(/g, method: 'access' },
    { pattern: /\.innerHTML\s*=/g, method: 'innerHTML' },
    { pattern: /\.textContent\s*=/g, method: 'textContent' },
    { pattern: /\.appendChild\s*\(/g, method: 'appendChild' },
    { pattern: /\.removeChild\s*\(/g, method: 'removeChild' },
    { pattern: /\.setAttribute\s*\(/g, method: 'setAttribute' }
  ];

  for (const { pattern, method } of domPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      domManipulations.push({
        method,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // Storage access patterns
  const storagePatterns = [
    { pattern: /(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\s*\(/g, type: 'webStorage' },
    { pattern: /document\.cookie/g, type: 'cookie' },
    { pattern: /indexedDB\./g, type: 'indexedDB' }
  ];

  for (const { pattern, type } of storagePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      storageAccess.push({
        type,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // Console usage patterns
  const consolePattern = /console\.(log|warn|error|info|debug|trace)\s*\(/g;
  let match;
  while ((match = consolePattern.exec(code)) !== null) {
    consoleUsage.push({
      method: match[1],
      line: getLineNumber(code, match.index),
      code: match[0]
    });
  }

  // Timer usage patterns
  const timerPatterns = [
    { pattern: /setTimeout\s*\(/g, type: 'setTimeout' },
    { pattern: /setInterval\s*\(/g, type: 'setInterval' },
    { pattern: /requestAnimationFrame\s*\(/g, type: 'requestAnimationFrame' },
    { pattern: /clearTimeout\s*\(/g, type: 'clearTimeout' },
    { pattern: /clearInterval\s*\(/g, type: 'clearInterval' }
  ];

  for (const { pattern, type } of timerPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      timerUsage.push({
        type,
        line: getLineNumber(code, match.index),
        code: match[0]
      });
    }
  }

  // Combine all
  const all = [
    ...networkCalls.map(c => ({ ...c, category: 'network' })),
    ...domManipulations.map(c => ({ ...c, category: 'dom' })),
    ...storageAccess.map(c => ({ ...c, category: 'storage' })),
    ...consoleUsage.map(c => ({ ...c, category: 'console' })),
    ...timerUsage.map(c => ({ ...c, category: 'timer' }))
  ];

  return {
    networkCalls,
    domManipulations,
    storageAccess,
    consoleUsage,
    timerUsage,
    all
  };
}
