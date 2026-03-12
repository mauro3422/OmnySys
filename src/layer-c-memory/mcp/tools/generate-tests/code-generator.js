/**
 * @fileoverview Code Generator for Test Generation
 *
 * Genera codigo de test basado en el analisis.
 *
 * @module mcp/tools/generate-tests/code-generator
 */

import { collectBranchImports, generateImports } from './code-generator/imports.js';
import { generateTestCase } from './code-generator/case-generation.js';
import { generateInputCall } from './code-generator/fallback-values.js';

const MAX_TESTS_PER_FILE = 12;
const LOW_VALUE_TYPES = new Set(['integration', 'branch-coverage', 'other']);

function selectTests(tests) {
  const happy = tests.filter(test => test.type === 'happy-path');
  const throws = tests.filter(test => test.type === 'error-throw');
  const branches = tests.filter(test => test.type === 'branch' && test.priority === 'high');
  const edges = tests.filter(test => test.type === 'edge-case' && test.priority !== 'low');
  const rest = tests.filter(test =>
    !happy.includes(test) &&
    !throws.includes(test) &&
    !branches.includes(test) &&
    !edges.includes(test) &&
    !LOW_VALUE_TYPES.has(test.type)
  );

  return [
    ...happy.slice(0, 1),
    ...throws,
    ...branches,
    ...edges,
    ...rest,
  ].slice(0, MAX_TESTS_PER_FILE);
}

function groupByType(tests) {
  const groups = new Map();

  for (const test of tests) {
    const label =
      test.type === 'happy-path' ? 'happy path' :
      test.type === 'branch' ? 'branches' :
      test.type === 'edge-case' ? 'edge cases' :
      test.type === 'error-throw' ? 'error handling' :
      'other';

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label).push(test);
  }

  return groups;
}

function renderGroupedTests(atom, groups, useSandbox) {
  let code = '';
  const useNested = groups.size > 1;

  if (useNested) {
    for (const [label, groupTests] of groups) {
      code += `  describe('${label}', () => {\n`;
      for (const test of groupTests) {
        code += generateTestCase(atom, test, useSandbox, '    ');
      }
      code += '  });\n\n';
    }
    return code;
  }

  for (const test of groups.values().next().value || []) {
    code += generateTestCase(atom, test, useSandbox);
  }

  return code;
}

export function generateTestCode(atom, tests, options = {}) {
  const { useRealFactories = true, outputPath = 'tests/generated' } = options;
  const hasSideEffects = atom.hasSideEffects ||
    atom.sideEffects?.hasStorageAccess ||
    atom.sideEffects?.hasNetworkCalls;
  const needSandbox = hasSideEffects || tests.some(test => test.needsSandbox);
  const selected = selectTests(tests);
  const branchImports = collectBranchImports(selected);
  const groups = groupByType(selected);

  let code = '';
  code += generateImports(atom, useRealFactories, needSandbox, branchImports, outputPath);
  code += `describe('${atom.name}', () => {\n`;
  code += renderGroupedTests(atom, groups, useRealFactories && needSandbox);
  code += '});\n';

  return code;
}

export { generateTestCase, generateInputCall };

export default {
  generateTestCode,
  generateTestCase,
  generateInputCall,
};
