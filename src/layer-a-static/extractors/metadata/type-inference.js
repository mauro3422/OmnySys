/**
 * @fileoverview type-inference.js
 *
 * Type Inference Extractor - Infers types from runtime checks and JSDoc
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/type-inference
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts type inference information from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Type information
 */
export function extractTypeInference(code) {
  const typeofChecks = [];
  const instanceofChecks = [];
  const defaultValues = [];
  const jsdocTypes = [];
  const nullChecks = [];

  // Extract typeof checks
  const typeofPattern = /typeof\s+(\w+)\s*(===?|!==?)\s*['"](\w+)['"]/g;
  let match;
  while ((match = typeofPattern.exec(code)) !== null) {
    typeofChecks.push({
      variable: match[1],
      type: match[3],
      operator: match[2],
      line: getLineNumber(code, match.index)
    });
  }

  // Extract instanceof checks
  const instanceofPattern = /(\w+)\s+instanceof\s+(\w+)/g;
  while ((match = instanceofPattern.exec(code)) !== null) {
    instanceofChecks.push({
      variable: match[1],
      class: match[2],
      line: getLineNumber(code, match.index)
    });
  }

  // Extract default values (type hints)
  const defaultPattern = /(\w+)\s*=\s*(\w+)\s*\|\|\s*(.+?)(?:;|,|\)|$)/g;
  while ((match = defaultPattern.exec(code)) !== null) {
    const defaultValue = match[3].trim();
    let inferredType = 'unknown';

    if (defaultValue.match(/^['"`]/)) inferredType = 'string';
    else if (defaultValue.match(/^\d+$/)) inferredType = 'number';
    else if (defaultValue === 'true' || defaultValue === 'false') inferredType = 'boolean';
    else if (defaultValue === '[]') inferredType = 'array';
    else if (defaultValue === '{}') inferredType = 'object';
    else if (defaultValue === 'null') inferredType = 'null';

    defaultValues.push({
      param: match[1],
      defaultValue,
      inferredType,
      line: getLineNumber(code, match.index)
    });
  }

  // Extract JSDoc types
  const jsdocPattern = /@param\s*\{([^}]+)\}\s*(\w+)/g;
  while ((match = jsdocPattern.exec(code)) !== null) {
    jsdocTypes.push({
      name: match[2],
      type: match[1],
      source: 'jsdoc',
      line: getLineNumber(code, match.index)
    });
  }

  // Extract @type annotations
  const typeAnnotationPattern = /@type\s*\{([^}]+)\}/g;
  while ((match = typeAnnotationPattern.exec(code)) !== null) {
    jsdocTypes.push({
      type: match[1],
      source: 'jsdoc-type',
      line: getLineNumber(code, match.index)
    });
  }

  // Extract null/undefined checks
  const nullCheckPattern = /(\w+)\s*(===?|!==?)\s*(null|undefined)/g;
  while ((match = nullCheckPattern.exec(code)) !== null) {
    nullChecks.push({
      variable: match[1],
      checkType: match[3],
      operator: match[2],
      line: getLineNumber(code, match.index)
    });
  }

  // Combine all
  const all = [
    ...typeofChecks.map(t => ({ ...t, category: 'typeof' })),
    ...instanceofChecks.map(i => ({ ...i, category: 'instanceof' })),
    ...defaultValues.map(d => ({ ...d, category: 'default' })),
    ...jsdocTypes.map(j => ({ ...j, category: 'jsdoc' })),
    ...nullChecks.map(n => ({ ...n, category: 'null_check' }))
  ];

  return {
    typeofChecks,
    instanceofChecks,
    defaultValues,
    jsdocTypes,
    nullChecks,
    all
  };
}
