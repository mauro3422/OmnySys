/**
 * @fileoverview Test Generator - Genera tests específicos basados en análisis
 */

import { buildAssertionFromReturnValue } from '../builders/assertion-builder.js';

/**
 * Genera tests específicos basados en el análisis del código fuente
 * @param {string} sourceCode - Código fuente
 * @param {Object} atom - Información del átomo
 * @param {Object} patterns - Patrones encontrados
 * @returns {Array} - Array de tests generados
 */
export function generateSpecificTests(sourceCode, atom, patterns) {
  const tests = [];

  // Agregar tests basados en patrones encontrados
  for (const pattern of patterns.patterns || []) {
    switch (pattern.type) {
      case 'return-value': {
        // Use the actual return value to build a precise assertion
        const assertion = buildAssertionFromReturnValue(pattern.value);
        // Sanitize: no newlines, max 60 chars for test name
        const valueSummary = pattern.value.replace(/\s+/g, ' ').slice(0, 40);
        tests.push({
          name: `should return ${valueSummary} for matching input`,
          type: 'return-value',
          inputs: {},
          assertion,
          source: 'code-analysis'
        });
        break;
      }

      case 'validation':
        tests.push({
          name: `should handle ${pattern.variable} = null/undefined`,
          type: 'edge-case',
          inputs: { [pattern.variable]: 'null' },
          assertion: `expect(() => ${atom.name}(null)).not.toThrow()`,
          source: 'code-analysis'
        });
        break;

      case 'condition':
        tests.push({
          name: `should handle ${pattern.variable} = ${pattern.value}`,
          type: 'condition-branch',
          inputs: { [pattern.variable]: /^\d+$/.test(pattern.value) ? pattern.value : `"${pattern.value}"` },
          assertion: 'expect(result).toBeDefined()',
          source: 'code-analysis'
        });
        break;

      case 'membership':
        tests.push({
          name: `should handle value "${pattern.value}"`,
          type: 'membership-test',
          inputs: {},
          assertion: 'expect(result).toBeDefined()',
          source: 'code-analysis'
        });
        break;

      case 'switch':
      case 'multi-branch':
        // Ya cubierto por branch-coverage
        break;

      case 'loop':
        tests.push({
          name: `should return empty result for empty array/collection`,
          type: 'empty-input',
          inputs: {},
          assertion: 'expect(Array.isArray(result) ? result : result).toBeDefined()',
          source: 'code-analysis'
        });
        tests.push({
          name: `should process single item array/collection`,
          type: 'single-item',
          inputs: {},
          assertion: 'expect(result).toBeDefined()',
          source: 'code-analysis'
        });
        break;

      case 'error-handling':
        tests.push({
          name: `should handle errors gracefully without propagating`,
          type: 'error-handling',
          inputs: {},
          assertion: `expect(() => ${atom.name}()).not.toThrow()`,
          source: 'code-analysis'
        });
        break;
    }
  }

  // Agregar ejemplos basados en literales encontrados
  for (const example of patterns.examples || []) {
    if (example.type === 'object') {
      const keys = Object.keys(example.value).slice(0, 3);
      const containsExpr = keys.length > 0
        ? `expect.objectContaining({ ${keys.map(k => `${k}: expect.anything()`).join(', ')} })`
        : 'expect.objectContaining({})';
      tests.push({
        name: `should handle object input ${JSON.stringify(example.value).slice(0, 30)}`,
        type: 'literal-example',
        inputs: example.value,
        assertion: `expect(result).toEqual(${containsExpr})`,
        source: 'code-literal'
      });
    }
  }

  return tests;
}
