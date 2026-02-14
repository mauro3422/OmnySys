/**
 * @fileoverview Throw Extractor
 * 
 * Extrae información de throw statements.
 * 
 * @module error-flow/extractors/throw-extractor
 * @version 1.0.0
 */

const implicitPatterns = [
  { pattern: /JSON\.parse\s*\(/, type: 'SyntaxError', confidence: 0.7 },
  { pattern: /JSON\.stringify\s*\(/, type: 'TypeError', confidence: 0.6 },
  { pattern: /localStorage\.getItem\s*\(/, type: 'Error', confidence: 0.5 },
  { pattern: /fetch\s*\(/, type: 'NetworkError', confidence: 0.6 }
];

export function extractThrows(code, typeContracts = {}) {
  const throws = [];
  
  // Desde typeContracts (JSDoc)
  if (typeContracts.throws) {
    for (const t of typeContracts.throws) {
      throws.push({ type: t.type, condition: t.condition, source: 'jsdoc', confidence: 0.9 });
    }
  }
  
  // Throws explícitos
  const throwPattern = /throw\s+(?:new\s+)?(\w+)(?:\s*\()?/g;
  let match;
  
  while ((match = throwPattern.exec(code)) !== null) {
    const errorType = match[1];
    if (!throws.some(t => t.type === errorType)) {
      const contextStart = Math.max(0, match.index - 200);
      const context = code.slice(contextStart, match.index);
      throws.push({
        type: errorType,
        condition: detectThrowCondition(context),
        source: 'explicit',
        confidence: 1.0,
        line: code.slice(0, match.index).split('\n').length
      });
    }
  }
  
  // Throws implícitos
  for (const { pattern, type, confidence } of implicitPatterns) {
    if (pattern.test(code)) {
      throws.push({ type, condition: `unprotected ${type.toLowerCase()} call`, source: 'implicit', confidence, implicit: true });
    }
  }
  
  return throws;
}

function detectThrowCondition(context) {
  const lines = context.split('\n');
  for (const line of lines.slice(-5).reverse()) {
    const ifMatch = line.match(/if\s*\(([^)]+)\)/);
    if (ifMatch) return ifMatch[1].trim();
    const whenMatch = line.match(/(?:when|unless)\s+(.*)/i);
    if (whenMatch) return whenMatch[1].trim();
  }
  return 'unknown';
}

export default { extractThrows };
