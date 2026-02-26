/**
 * @fileoverview Test Analyzer for Test Generation
 * 
 * Analiza funciones y sugiere tests basados en metadata rica
 * y análisis del código fuente.
 * 
 * @module mcp/tools/generate-tests/test-analyzer
 */

import {
  generateTypedInputs
} from './input-generator.js';
import {
  readFunctionSource,
  analyzeSourceForTests,
  generateSpecificTests
} from './source-analyzer.js';
import { extractBranches } from './branch-extractor.js';
import { createHappyPathTest } from './test-analyzer/test-creators/happy-path.js';
import { createThrowTests } from './test-analyzer/test-creators/throw.js';
import { createEdgeCaseTests } from './test-analyzer/test-creators/edge-case.js';
import { createArchetypeTests } from './test-analyzer/test-creators/archetype.js';
import { createSideEffectsTest, createBranchCoverageTest } from './test-analyzer/test-creators/side-effects.js';
import { createBranchTests } from './test-analyzer/test-creators/branch.js';
import { hasSideEffects } from './test-analyzer/test-utils.js';

/**
 * Analiza una funcion y genera tests sugeridos basados en metadata rica
 */
export async function analyzeFunctionForTests(atom, projectPath) {
  const tests = [];
  const inputs = (atom.dataFlow?.inputs?.length > 0)
    ? atom.dataFlow.inputs
    : (atom.params || []).map(p => ({ name: p, type: 'unknown' }));
  const outputs = atom.dataFlow?.outputs || [];
  const archetype = atom.archetype?.type || 'unknown';
  const complexity = atom.complexity || 1;
  const errorFlow = atom.errorFlow || {};
  const typeContracts = atom.typeContracts || {};

  const sourceCode = await readFunctionSource(projectPath, atom.filePath, atom);
  const sourcePatterns = analyzeSourceForTests(sourceCode, atom);

  tests.push(createHappyPathTest(inputs, outputs, typeContracts, atom, sourcePatterns));
  tests.push(...createThrowTests(errorFlow, inputs, typeContracts, atom));
  tests.push(...createEdgeCaseTests(inputs, atom));

  if (sourceCode) {
    const sourceLines = sourceCode.split('\n');
    const branches = extractBranches(sourceLines, atom);
    if (branches.length > 0) {
      tests.push(...createBranchTests(branches, atom));
    } else {
      const sourceTests = generateSpecificTests(sourceCode, atom, sourcePatterns);
      tests.push(...sourceTests.slice(0, 3));
    }
  }

  tests.push(...createArchetypeTests(atom, archetype, inputs, typeContracts));

  if (hasSideEffects(atom) && !atom.isAsync) {
    tests.push(createSideEffectsTest(atom, inputs, typeContracts));
  }

  if (complexity > 15) {
    tests.push(createBranchCoverageTest(complexity, inputs, typeContracts, atom));
  }

  const seen = new Set();
  return tests.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
}

export default {
  analyzeFunctionForTests
};
