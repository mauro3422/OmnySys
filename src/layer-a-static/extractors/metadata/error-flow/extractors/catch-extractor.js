/**
 * @fileoverview Catch Extractor
 * 
 * Extrae información de catch blocks.
 * 
 * @module error-flow/extractors/catch-extractor
 * @version 1.0.0
 */

export function extractCatches(code) {
  const catches = [];
  const catchPattern = /catch\s*\(\s*(?:\w+\s+)?(\w+)?\s*\)/g;
  let match;
  
  while ((match = catchPattern.exec(code)) !== null) {
    const errorVar = match[1] || 'error';
    const afterCatch = code.slice(match.index, match.index + 500);
    
    const handling = {
      type: 'generic',
      variable: errorVar,
      rethrows: /throw\s+\w+/.test(afterCatch),
      logs: /console\.(log|error|warn)/.test(afterCatch),
      returns: /return\s+/.test(afterCatch),
      transforms: /new\s+\w+Error/.test(afterCatch)
    };
    
    const typeMatch = afterCatch.match(/instanceof\s+(\w+)/);
    if (typeMatch) handling.type = typeMatch[1];
    
    catches.push(handling);
  }
  
  return catches;
}

export function extractTryBlocks(code) {
  const blocks = [];
  const tryPattern = /try\s*\{/g;
  const matches = code.match(tryPattern) || [];
  
  for (let i = 0; i < matches.length; i++) {
    const tryIndex = code.indexOf(matches[i]);
    const blockEnd = findBlockEnd(code, tryIndex);
    const block = code.slice(tryIndex, blockEnd);
    
    blocks.push({
      hasCatch: /catch\s*\(/.test(block),
      hasFinally: /finally\s*\{/.test(block),
      lines: block.split('\n').length,
      protectedCalls: detectProtectedCalls(block)
    });
  }
  
  return blocks;
}

function findBlockEnd(code, start) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return code.length;
}

function detectProtectedCalls(block) {
  const calls = [];
  const callPattern = /(\w+)\s*\(/g;
  let match;
  while ((match = callPattern.exec(block)) !== null) calls.push(match[1]);
  return [...new Set(calls)];
}

export default { extractCatches, extractTryBlocks };
