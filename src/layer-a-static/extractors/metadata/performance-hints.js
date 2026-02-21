/**
 * @fileoverview performance-hints.js
 *
 * Performance Hints Extractor - Detects performance anti-patterns
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/performance-hints
 */

import { getLineNumber } from '../utils.js';

// ── Private helpers ───────────────────────────────────────────────────────────

const BLOCKING_PATTERNS = [
  { pattern: /readFileSync\s*\(/g,  type: 'fs.readFileSync' },
  { pattern: /writeFileSync\s*\(/g, type: 'fs.writeFileSync' },
  { pattern: /execSync\s*\(/g,      type: 'execSync' },
  { pattern: /alert\s*\(/g,         type: 'alert' },
  { pattern: /prompt\s*\(/g,        type: 'prompt' },
  { pattern: /confirm\s*\(/g,       type: 'confirm' }
];

function findLoopStarts(code) {
  const loopPattern = /(for|while|do)\s*\(/g;
  const starts = [];
  let match;
  while ((match = loopPattern.exec(code)) !== null) {
    starts.push({ type: match[1], line: getLineNumber(code, match.index), index: match.index });
  }
  return starts;
}

/** Extrae el cuerpo de un loop dado su índice de inicio usando conteo de llaves */
function extractLoopBody(code, startIndex) {
  let braceCount = 0;
  let end = startIndex;
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') braceCount++;
    if (code[i] === '}') { braceCount--; if (braceCount === 0) { end = i; break; } }
  }
  return { body: code.substring(startIndex, end), end };
}

function detectNestedLoops(loopStarts, code) {
  const nestedLoops = [];
  for (let i = 0; i < loopStarts.length; i++) {
    const outer = loopStarts[i];
    let braceCount = 0;
    let foundNested = false;
    for (let j = outer.index; j < code.length; j++) {
      if (code[j] === '{') braceCount++;
      if (code[j] === '}') { braceCount--; if (braceCount === 0) break; }
      for (let k = i + 1; k < loopStarts.length; k++) {
        const inner = loopStarts[k];
        if (inner.index > outer.index && inner.index < j) {
          nestedLoops.push({ outerType: outer.type, innerType: inner.type, outerLine: outer.line, innerLine: inner.line, depth: 2 });
          foundNested = true;
          break;
        }
      }
      if (foundNested) break;
    }
  }
  return nestedLoops;
}

function detectArrayChains(code) {
  const pattern = /\.(map|filter|reduce|forEach|find|some|every)\s*\([^)]*\)\s*\.(map|filter|reduce|forEach|find|some|every)/g;
  const results = [];
  let match;
  while ((match = pattern.exec(code)) !== null) {
    results.push({ methods: [match[1], match[2]], line: getLineNumber(code, match.index), type: 'chain' });
  }
  return results;
}

function detectBlockingOps(code) {
  const results = [];
  for (const { pattern, type } of BLOCKING_PATTERNS) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      results.push({ type, line: getLineNumber(code, match.index) });
    }
  }
  return results;
}

function detectRegexInLoops(loopStarts, code) {
  const results = [];
  for (const loop of loopStarts) {
    const { body, end: _ } = extractLoopBody(code, loop.index);
    const regexPattern = /new\s+RegExp\s*\(/g;
    let m;
    while ((m = regexPattern.exec(body)) !== null) {
      results.push({ line: getLineNumber(code, loop.index + m.index), reason: 'regex-in-loop', loopType: loop.type });
    }
  }
  return results;
}

function detectMemoryRisks(loopStarts, code) {
  const results = [];
  for (const loop of loopStarts) {
    const { body } = extractLoopBody(code, loop.index);
    if (/(?:function|=>)/.test(body)) {
      results.push({ line: loop.line, type: 'closure-in-loop', loopType: loop.type });
    }
  }
  return results;
}

/**
 * Extracts performance hints from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Performance information
 */
export function extractPerformanceHints(code) {
  const loopStarts         = findLoopStarts(code);
  const nestedLoops        = detectNestedLoops(loopStarts, code);
  const largeArrayOps      = detectArrayChains(code);
  const blockingOperations = detectBlockingOps(code);
  const regexIssues        = detectRegexInLoops(loopStarts, code);
  const memoryRisks        = detectMemoryRisks(loopStarts, code);

  let estimatedComplexity = 'O(n)';
  if (nestedLoops.length > 0) estimatedComplexity = nestedLoops.some(n => n.depth >= 3) ? 'O(n^3)' : 'O(n^2)';
  else if (largeArrayOps.length > 2) estimatedComplexity = 'O(n^2)';

  return {
    nestedLoops, largeArrayOps, blockingOperations, regexIssues, memoryRisks, estimatedComplexity,
    all: [
      ...nestedLoops.map(n => ({ ...n, category: 'nested_loop' })),
      ...largeArrayOps.map(a => ({ ...a, category: 'array_chain' })),
      ...blockingOperations.map(b => ({ ...b, category: 'blocking' })),
      ...regexIssues.map(r => ({ ...r, category: 'regex' })),
      ...memoryRisks.map(m => ({ ...m, category: 'memory' }))
    ]
  };
}
