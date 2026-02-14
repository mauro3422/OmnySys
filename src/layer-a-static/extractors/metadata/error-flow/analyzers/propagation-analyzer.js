/**
 * @fileoverview Propagation Analyzer
 * 
 * Analiza patrones de propagación de errores.
 * 
 * @module error-flow/analyzers/propagation-analyzer
 * @version 1.0.0
 */

export function detectPropagationPattern(code) {
  const hasTryCatch = /try\s*\{/.test(code) && /catch\s*\(/.test(code);
  const hasThrows = /throw\s+/.test(code);
  const rethrowPattern = /catch\s*\([^)]+\)\s*\{[^}]*throw\s+/;
  const hasRethrow = rethrowPattern.test(code);
  
  if (!hasTryCatch && !hasThrows) return 'none';
  if (hasRethrow) return 'partial';
  if (hasTryCatch && hasThrows) return 'full';
  return 'partial';
}

export function detectUnhandledCalls(code) {
  const unhandled = [];
  const riskyCalls = [
    { pattern: /fetch\s*\(/g, name: 'fetch' },
    { pattern: /JSON\.parse\s*\(/g, name: 'JSON.parse' },
    { pattern: /localStorage\.(get|set)Item/g, name: 'localStorage' }
  ];
  
  for (const { pattern, name } of riskyCalls) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      if (!isInsideTryBlock(code, match.index)) {
        unhandled.push({ call: name, position: match.index });
      }
    }
  }
  
  return unhandled;
}

function isInsideTryBlock(code, position) {
  const beforeCode = code.slice(0, position);
  const tryMatches = beforeCode.match(/try\s*\{/g) || [];
  const catchMatches = beforeCode.match(/catch\s*\([^)]*\)\s*\{/g) || [];
  return tryMatches.length > catchMatches.length;
}

export default { detectPropagationPattern, detectUnhandledCalls };
