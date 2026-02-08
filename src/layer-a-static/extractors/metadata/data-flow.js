/**
 * @fileoverview data-flow.js
 *
 * Data Flow Extractor - Tracks variable assignments, returns, parameters
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/data-flow
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts data flow patterns from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Data flow information
 */
export function extractDataFlow(code) {
  const assignments = [];
  const returnStatements = [];
  const parameterUsage = [];
  const spreadUsage = [];

  // Extract variable assignments
  const assignmentPattern = /(const|let|var)\s+(\w+)\s*=\s*([^;]+)/g;
  let match;
  while ((match = assignmentPattern.exec(code)) !== null) {
    assignments.push({
      type: match[1],
      variable: match[2],
      value: match[3].trim(),
      line: getLineNumber(code, match.index)
    });
  }

  // Extract return statements
  const returnPattern = /return\s+([^;]+)/g;
  while ((match = returnPattern.exec(code)) !== null) {
    returnStatements.push({
      value: match[1].trim(),
      line: getLineNumber(code, match.index)
    });
  }

  // Extract destructuring/spread patterns
  const destructuringPatterns = [
    // const { a, b } = obj
    { pattern: /(const|let|var)\s*\{([^}]+)\}\s*=/g, type: 'object' },
    // const [ a, b ] = arr
    { pattern: /(const|let|var)\s*\[([^\]]+)\]\s*=/g, type: 'array' },
    // ...spread
    { pattern: /\.\.\.(\w+)/g, type: 'spread' }
  ];

  for (const { pattern, type } of destructuringPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      spreadUsage.push({
        type,
        variables: match[2] ? match[2].split(',').map(v => v.trim()) : [match[1]],
        line: getLineNumber(code, match.index)
      });
    }
  }

  // Extract function parameter usage (simplified)
  const functionPattern = /function\s+\w+\s*\(([^)]+)\)|(?:const|let|var)\s+\w+\s*=\s*\(([^)]+)\)\s*=>/g;
  while ((match = functionPattern.exec(code)) !== null) {
    const params = (match[1] || match[2] || '').split(',').map(p => p.trim()).filter(Boolean);

    if (params.length > 0) {
      parameterUsage.push({
        params,
        line: getLineNumber(code, match.index),
        count: params.length
      });
    }
  }

  // Combine all
  const all = [
    ...assignments.map(a => ({ ...a, category: 'assignment' })),
    ...returnStatements.map(r => ({ ...r, category: 'return' })),
    ...spreadUsage.map(s => ({ ...s, category: 'spread' })),
    ...parameterUsage.map(p => ({ ...p, category: 'parameter' }))
  ];

  return {
    assignments,
    returnStatements,
    parameterUsage,
    spreadUsage,
    all
  };
}
