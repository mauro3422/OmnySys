/**
 * @fileoverview Test Analyzer for Test Generation
 * 
 * Analiza funciones y sugiere tests basados en metadata rica
 * y análisis del código fuente.
 * 
 * @module mcp/tools/generate-tests/test-analyzer
 */

import { 
  generateTypedInputs, 
  generateInputsForThrowCondition,
  generateInvalidInputs 
} from './input-generator.js';
import { 
  readFunctionSource, 
  analyzeSourceForTests,
  generateSpecificTests 
} from './source-analyzer.js';

/**
 * Analiza una funcion y genera tests sugeridos basados en metadata rica
 */
export async function analyzeFunctionForTests(atom, projectPath) {
  const tests = [];
  const inputs = atom.dataFlow?.inputs || [];
  const outputs = atom.dataFlow?.outputs || [];
  const archetype = atom.archetype?.type || 'unknown';
  const complexity = atom.complexity || 1;
  const errorFlow = atom.errorFlow || {};
  const asyncAnalysis = atom.asyncAnalysis || {};
  const typeContracts = atom.typeContracts || {};
  
  // Leer y analizar código fuente
  const sourceCode = await readFunctionSource(projectPath, atom.filePath, atom);
  const sourcePatterns = analyzeSourceForTests(sourceCode, atom);
  
  // Test 1: Happy path
  tests.push(createHappyPathTest(inputs, outputs, typeContracts, atom, sourcePatterns));
  
  // Test 2: Tests basados en errorFlow.throws (específicos)
  tests.push(...createThrowTests(errorFlow, inputs, typeContracts, atom));
  
  // Test 3: Edge cases basados en inputs
  tests.push(...createEdgeCaseTests(inputs));
  
  // Test 4: Tests basados en análisis del código fuente
  if (sourceCode) {
    const sourceTests = generateSpecificTests(sourceCode, atom, sourcePatterns);
    tests.push(...sourceTests.slice(0, 3)); // Limitar a 3 tests de código fuente
  }
  
  // Test 5: Tests basados en archetype
  tests.push(...createArchetypeTests(atom, archetype, inputs, typeContracts));
  
  // Test 6: Async patterns
  if (atom.isAsync) {
    tests.push(...createAsyncTests(atom, asyncAnalysis, inputs, typeContracts));
  }
  
  // Test 7: Side effects
  if (hasSideEffects(atom)) {
    tests.push(createSideEffectsTest(atom, inputs, typeContracts));
  }
  
  // Test 8: Branch coverage para alta complejidad
  if (complexity > 15) {
    tests.push(createBranchCoverageTest(complexity, inputs, typeContracts, atom));
  }
  
  return tests;
}

/**
 * Crea test de happy path
 */
function createHappyPathTest(inputs, outputs, typeContracts, atom, sourcePatterns) {
  // Si hay ejemplos del código fuente, usarlos
  const sourceExample = sourcePatterns?.examples?.find(e => e.type === 'object');
  
  return {
    name: `should return valid output for valid input`,
    type: 'happy-path',
    description: 'Caso exitoso basico con inputs validos',
    inputs: generateTypedInputs(inputs, typeContracts, atom),
    setup: generateSetup(atom),
    assertion: generateAssertion(outputs, atom.name, typeContracts),
    priority: 'high',
    sourceExample: sourceExample?.value
  };
}

/**
 * Crea tests para cada throw condition
 */
function createThrowTests(errorFlow, inputs, typeContracts, atom) {
  const tests = [];
  const throws = errorFlow?.throws || [];
  
  for (const thrown of throws.slice(0, 3)) {
    const condition = thrown.condition || 'unknown';
    tests.push({
      name: `should throw ${thrown.type || 'Error'} when ${condition}`,
      type: 'error-throw',
      description: `Throw condition: ${condition} (line ${thrown.line})`,
      inputs: generateInputsForThrowCondition(thrown, inputs, typeContracts, atom),
      assertion: atom.isAsync 
        ? `await expect(${atom.name}(...)).rejects.toThrow()` 
        : `expect(() => ${atom.name}(...)).toThrow()`,
      throwInfo: thrown,
      priority: 'high'
    });
  }
  
  return tests;
}

/**
 * Crea tests de edge cases
 */
function createEdgeCaseTests(inputs) {
  const tests = [];
  
  for (const input of inputs.slice(0, 2)) {
    tests.push({
      name: `should handle ${input.name} = null/undefined`,
      type: 'edge-case',
      description: `Edge case: ${input.name} vacio`,
      inputs: { [input.name]: 'null' },
      assertion: 'expect(result).toBeDefined()',
      priority: 'medium'
    });
  }
  
  return tests;
}

/**
 * Crea tests basados en archetype
 */
function createArchetypeTests(atom, archetype, inputs, typeContracts) {
  const tests = [];
  const typedInputs = generateTypedInputs(inputs, typeContracts, atom);
  
  switch (archetype) {
    case 'orchestrator':
      tests.push({
        name: `should orchestrate internal calls correctly`,
        type: 'integration',
        description: 'Test de integracion para orquestador',
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        internalCalls: atom.callGraph?.callsList?.slice(0, 5),
        priority: 'medium'
      });
      break;
      
    case 'transformer':
      tests.push({
        name: `should transform input to expected output`,
        type: 'transformation',
        description: 'Test de transformacion',
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        priority: 'medium'
      });
      break;
      
    case 'validator':
      tests.push({
        name: `should return boolean validation result`,
        type: 'validation',
        description: 'Test de validacion',
        inputs: typedInputs,
        assertion: 'expect(typeof result).toBe("boolean")',
        priority: 'medium'
      });
      break;
      
    case 'handler':
      tests.push({
        name: `should handle event/data correctly`,
        type: 'handler',
        description: 'Test de handler',
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        priority: 'medium'
      });
      break;
  }
  
  return tests;
}

/**
 * Crea tests para funciones async
 */
function createAsyncTests(atom, asyncAnalysis, inputs, typeContracts) {
  const tests = [];
  const typedInputs = generateTypedInputs(inputs, typeContracts, atom);
  
  tests.push({
    name: `should resolve successfully`,
    type: 'async',
    description: 'Resolucion de promesa',
    inputs: typedInputs,
    setup: generateSetup(atom),
    assertion: 'expect(result).toBeDefined()',
    priority: 'medium'
  });
  
  // Si hay waterfall pattern
  const seqOps = asyncAnalysis.sequentialOperations || [];
  if (seqOps.some(op => op.type === 'sequential-awaits' && op.count > 2)) {
    tests.push({
      name: `should handle sequential async operations`,
      type: 'async-waterfall',
      description: `Test para waterfall pattern (${seqOps[0]?.count || 0} sequential awaits)`,
      inputs: typedInputs,
      assertion: 'expect(result).toBeDefined()',
      asyncWarning: true,
      priority: 'medium'
    });
  }
  
  return tests;
}

/**
 * Crea test de side effects
 */
function createSideEffectsTest(atom, inputs, typeContracts) {
  return {
    name: `should apply side effects correctly`,
    type: 'side-effects',
    description: 'Verificacion de side effects',
    inputs: generateTypedInputs(inputs, typeContracts, atom),
    setup: generateSetup(atom),
    assertion: 'expect(result).toBeDefined()',
    needsSandbox: true,
    sideEffects: atom.sideEffects,
    priority: 'medium'
  };
}

/**
 * Crea test de branch coverage
 */
function createBranchCoverageTest(complexity, inputs, typeContracts, atom) {
  return {
    name: `should cover all branches (complexity: ${complexity})`,
    type: 'branch-coverage',
    description: `Alta complejidad requiere mas tests`,
    inputs: generateTypedInputs(inputs, typeContracts, atom),
    assertion: 'expect(result).toBeDefined()',
    priority: 'medium'
  };
}

/**
 * Genera setup code basado en la funcion
 */
function generateSetup(atom) {
  const setup = [];
  const calls = atom.callGraph?.callsList || [];
  const internalCalls = calls.filter(c => c.type === 'internal' || c.type === 'external');
  
  if (internalCalls.length > 0 && atom.archetype?.type === 'orchestrator') {
    setup.push(`// Mock internal calls: ${internalCalls.map(c => c.name).slice(0, 5).join(', ')}`);
  }
  
  return setup;
}

/**
 * Genera asercion basada en outputs y typeContracts
 */
function generateAssertion(outputs, functionName, typeContracts) {
  const returns = typeContracts?.returns;
  
  if (returns?.type === 'boolean') {
    return 'expect(typeof result).toBe("boolean")';
  }
  
  if (returns?.type === 'Object' || returns?.type === 'object') {
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }
  
  if (returns?.type === 'string') {
    return 'expect(typeof result).toBe("string")';
  }
  
  const returnOutput = outputs?.find(o => o.type === 'return');
  if (returnOutput) {
    return 'expect(result).toBeDefined()';
  }
  
  return 'expect(result).toBeDefined()';
}

/**
 * Verifica si tiene side effects
 */
function hasSideEffects(atom) {
  return atom.hasSideEffects || 
         atom.sideEffects?.hasStorageAccess || 
         atom.sideEffects?.hasNetworkCalls;
}

export default {
  analyzeFunctionForTests
};
