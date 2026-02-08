/**
 * @fileoverview performance-hints.js
 *
 * Performance Hints Extractor - Detects performance anti-patterns
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/performance-hints
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts performance hints from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Performance information
 */
export function extractPerformanceHints(code) {
  const nestedLoops = [];
  const largeArrayOps = [];
  const blockingOperations = [];
  const regexIssues = [];
  const memoryRisks = [];

  // Detect nested loops
  const loopPattern = /(for|while|do)\s*\(/g;
  const lines = code.split('\n');
  const loopStarts = [];

  let match;
  while ((match = loopPattern.exec(code)) !== null) {
    const line = getLineNumber(code, match.index);
    loopStarts.push({ type: match[1], line, index: match.index });
  }

  // Check for nesting by analyzing scope
  for (let i = 0; i < loopStarts.length; i++) {
    const outerLoop = loopStarts[i];
    let braceCount = 0;
    let foundNested = false;

    // Find the body of the outer loop
    for (let j = outerLoop.index; j < code.length; j++) {
      if (code[j] === '{') braceCount++;
      if (code[j] === '}') {
        braceCount--;
        if (braceCount === 0) break;
      }

      // Check if there's another loop inside
      for (let k = i + 1; k < loopStarts.length; k++) {
        const innerLoop = loopStarts[k];
        if (innerLoop.index > outerLoop.index && innerLoop.index < j) {
          nestedLoops.push({
            outerType: outerLoop.type,
            innerType: innerLoop.type,
            outerLine: outerLoop.line,
            innerLine: innerLoop.line,
            depth: 2 // Simplified
          });
          foundNested = true;
          break;
        }
      }
      if (foundNested) break;
    }
  }

  // Detect array method chains
  const arrayChainPattern = /\.(map|filter|reduce|forEach|find|some|every)\s*\([^)]*\)\s*\.(map|filter|reduce|forEach|find|some|every)/g;
  while ((match = arrayChainPattern.exec(code)) !== null) {
    largeArrayOps.push({
      methods: [match[1], match[2]],
      line: getLineNumber(code, match.index),
      type: 'chain'
    });
  }

  // Detect blocking operations
  const blockingPatterns = [
    { pattern: /readFileSync\s*\(/g, type: 'fs.readFileSync' },
    { pattern: /writeFileSync\s*\(/g, type: 'fs.writeFileSync' },
    { pattern: /execSync\s*\(/g, type: 'execSync' },
    { pattern: /alert\s*\(/g, type: 'alert' },
    { pattern: /prompt\s*\(/g, type: 'prompt' },
    { pattern: /confirm\s*\(/g, type: 'confirm' }
  ];

  for (const { pattern, type } of blockingPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      blockingOperations.push({
        type,
        line: getLineNumber(code, match.index)
      });
    }
  }

  // Detect regex in loops (performance risk)
  for (const loop of loopStarts) {
    const loopBodyStart = loop.index;
    let braceCount = 0;
    let loopBodyEnd = loopBodyStart;

    for (let i = loopBodyStart; i < code.length; i++) {
      if (code[i] === '{') braceCount++;
      if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          loopBodyEnd = i;
          break;
        }
      }
    }

    const loopBody = code.substring(loopBodyStart, loopBodyEnd);
    const regexPattern = /new\s+RegExp\s*\(/g;
    let regexMatch;
    while ((regexMatch = regexPattern.exec(loopBody)) !== null) {
      regexIssues.push({
        line: getLineNumber(code, loopBodyStart + regexMatch.index),
        reason: 'regex-in-loop',
        loopType: loop.type
      });
    }
  }

  // Detect memory risks (closures in loops)
  for (const loop of loopStarts) {
    const loopBodyStart = loop.index;
    let braceCount = 0;
    let loopBodyEnd = loopBodyStart;

    for (let i = loopBodyStart; i < code.length; i++) {
      if (code[i] === '{') braceCount++;
      if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          loopBodyEnd = i;
          break;
        }
      }
    }

    const loopBody = code.substring(loopBodyStart, loopBodyEnd);
    const closurePattern = /(?:function|=>)/g;
    if (closurePattern.test(loopBody)) {
      memoryRisks.push({
        line: loop.line,
        type: 'closure-in-loop',
        loopType: loop.type
      });
    }
  }

  // Estimate complexity (heuristic)
  let estimatedComplexity = 'O(n)';
  if (nestedLoops.length > 0) {
    estimatedComplexity = nestedLoops.some(n => n.depth >= 3) ? 'O(n^3)' : 'O(n^2)';
  } else if (largeArrayOps.length > 2) {
    estimatedComplexity = 'O(n^2)';
  }

  // Combine all
  const all = [
    ...nestedLoops.map(n => ({ ...n, category: 'nested_loop' })),
    ...largeArrayOps.map(a => ({ ...a, category: 'array_chain' })),
    ...blockingOperations.map(b => ({ ...b, category: 'blocking' })),
    ...regexIssues.map(r => ({ ...r, category: 'regex' })),
    ...memoryRisks.map(m => ({ ...m, category: 'memory' }))
  ];

  return {
    nestedLoops,
    largeArrayOps,
    blockingOperations,
    regexIssues,
    memoryRisks,
    estimatedComplexity,
    all
  };
}
