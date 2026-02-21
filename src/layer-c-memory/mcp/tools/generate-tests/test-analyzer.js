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
  tests.push(...createEdgeCaseTests(inputs, atom));
  
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
  
  // Test 8: Branch coverage — threshold 8 cubre la mayoría del sistema (era 15, muy alto)
  if (complexity > 8) {
    tests.push(createBranchCoverageTest(complexity, inputs, typeContracts, atom));
  }
  
  // Deduplicate by test name across all generators
  const seen = new Set();
  return tests.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
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
    assertion: generateAssertion(outputs, atom.name, typeContracts, atom),
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
 * Crea tests de edge cases para TODOS los inputs (no solo los primeros 2)
 */
function createEdgeCaseTests(inputs, atom) {
  const tests = [];

  for (const input of inputs) {
    // null/undefined para todos los parámetros
    tests.push({
      name: `should handle ${input.name} = null/undefined`,
      type: 'edge-case',
      description: `Edge case: ${input.name} vacio`,
      inputs: { [input.name]: 'null' },
      assertion: generateEdgeCaseAssertion(input.name, atom),
      priority: input.hasDefault ? 'low' : 'medium'
    });

    // Si el parámetro es string, también probar cadena vacía
    if (input.type === 'string' || input.name.toLowerCase().includes('text') ||
        input.name.toLowerCase().includes('code') || input.name.toLowerCase().includes('path')) {
      const emptyAssertion = generateAssertion(
        atom?.dataFlow?.outputs, atom?.name, atom?.typeContracts, atom
      );
      tests.push({
        name: `should handle ${input.name} = empty string`,
        type: 'edge-case',
        description: `Edge case: ${input.name} cadena vacía`,
        inputs: { [input.name]: '""' },
        assertion: emptyAssertion,
        priority: 'low'
      });
    }

    // Si el parámetro es array, probar array vacío
    if (input.type === 'array' || input.name.toLowerCase().includes('arr') ||
        input.name.toLowerCase().includes('list') || input.name.toLowerCase().includes('items')) {
      tests.push({
        name: `should handle ${input.name} = empty array`,
        type: 'edge-case',
        description: `Edge case: ${input.name} array vacío`,
        inputs: { [input.name]: '[]' },
        assertion: generateAssertion(atom?.dataFlow?.outputs, atom?.name, atom?.typeContracts, atom),
        priority: 'low'
      });
    }
  }

  return tests;
}

/**
 * Crea tests basados en archetype, callerPattern y dna.flowType
 */
function createArchetypeTests(atom, archetype, inputs, typeContracts) {
  const tests = [];
  const typedInputs = generateTypedInputs(inputs, typeContracts, atom);
  const callerPattern = atom.callerPattern?.id || 'direct_call';
  const dnaFlow = atom.dna?.flowType || '';
  const calledBy = atom.calledBy || [];

  // Adaptar el nombre/descripción según cómo se invoca
  const invocationNote = callerPattern === 'callback'
    ? ' (invocado como callback)'
    : callerPattern === 'event_handler'
      ? ' (invocado como event handler)'
      : '';

  // Si tiene callers reales, sugerir integration test
  if (calledBy.length > 0 && calledBy.length <= 5) {
    const callerNames = calledBy.map(c => c.split('::').pop()).join(', ');
    tests.push({
      name: `should integrate correctly with callers`,
      type: 'integration',
      description: `Llamado desde: ${callerNames}`,
      inputs: typedInputs,
      assertion: 'expect(result).toBeDefined()',
      priority: 'medium',
      note: `Callers reales: ${calledBy.slice(0, 3).join(', ')}`
    });
  }

  switch (archetype) {
    case 'orchestrator': {
      const internalCalls = atom.callGraph?.callsList?.filter(c => c.type !== 'native').slice(0, 5) || [];
      tests.push({
        name: `should orchestrate internal calls correctly${invocationNote}`,
        type: 'integration',
        description: `Orquesta: ${internalCalls.map(c => c.name).join(', ') || 'múltiples funciones'}`,
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        internalCalls,
        priority: 'medium'
      });
      break;
    }

    case 'transformer': {
      // DNA flowType guía la assertion
      const transformAssertion = dnaFlow.includes('return')
        ? 'expect(result).not.toEqual(expect.objectContaining({}))'  // debe ser distinto del input
        : 'expect(result).toBeDefined()';
      tests.push({
        name: `should transform input to expected output${invocationNote}`,
        type: 'transformation',
        description: `Flow: ${dnaFlow || 'transform'}`,
        inputs: typedInputs,
        assertion: transformAssertion,
        priority: 'medium'
      });
      break;
    }

    case 'validator':
      tests.push({
        name: `should return boolean validation result${invocationNote}`,
        type: 'validation',
        description: 'Valida y retorna boolean',
        inputs: typedInputs,
        assertion: 'expect(typeof result).toBe("boolean")',
        priority: 'medium'
      });
      // También test de caso inválido para validators
      tests.push({
        name: `should return false for invalid input`,
        type: 'validation-negative',
        description: 'Caso inválido retorna false',
        inputs: generateInvalidInputs(inputs),
        assertion: 'expect(result).toBe(false)',
        priority: 'high'
      });
      break;

    case 'handler':
      tests.push({
        name: `should handle event/data correctly${invocationNote}`,
        type: 'handler',
        description: callerPattern === 'event_handler'
          ? 'Handler de evento — verificar que no lanza'
          : 'Procesa datos de entrada',
        inputs: typedInputs,
        assertion: callerPattern === 'event_handler'
          ? 'expect(() => result).not.toThrow()'
          : 'expect(result).toBeDefined()',
        priority: 'medium'
      });
      break;

    case 'factory':
      tests.push({
        name: `should create and return a valid object`,
        type: 'factory',
        description: `Factory — DNA: ${dnaFlow || 'create-return'}`,
        inputs: typedInputs,
        assertion: 'expect(result).toEqual(expect.objectContaining({}))',
        priority: 'high'
      });
      break;

    case 'persister':
      tests.push({
        name: `should persist data without throwing`,
        type: 'persister',
        description: 'Persiste datos — verificar que completa sin error',
        inputs: typedInputs,
        assertion: 'expect(result).toBeDefined()',
        needsSandbox: true,
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
 * Genera asercion basada en outputs, typeContracts, dataFlow, DNA y nombre de función
 */
function generateAssertion(outputs, functionName, typeContracts, atom) {
  const returns = typeContracts?.returns;
  const dnaFlow = atom?.dna?.flowType || '';
  const dnaOps  = atom?.dna?.operationSequence || [];

  // 1. typeContracts.returns — más fiable que cualquier heurística
  if (returns?.type === 'boolean') return 'expect(typeof result).toBe("boolean")';
  if (returns?.type === 'string')  return 'expect(typeof result).toBe("string")';
  if (returns?.type === 'number' || returns?.type === 'Number') return 'expect(typeof result).toBe("number")';
  if (returns?.type === 'array'  || returns?.type === 'Array')  return 'expect(Array.isArray(result)).toBe(true)';
  if (returns?.type === 'Object' || returns?.type === 'object') {
    const knownFields = outputs?.filter(o => !o.isSideEffect && o.type === 'return' && o.name) || [];
    if (knownFields.length > 0) {
      const fields = knownFields.slice(0, 3).map(o => `${o.name}: expect.anything()`).join(', ');
      return `expect(result).toEqual(expect.objectContaining({ ${fields} }))`;
    }
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }

  // 2. Function name conventions — very reliable signal
  const name = (functionName || '').toLowerCase();
  if (/^(is|has|can|should|check|validate|verify)/.test(name)) {
    return 'expect(typeof result).toBe("boolean")';
  }
  if (/^(count|size|length|total|num)/.test(name)) {
    return 'expect(typeof result).toBe("number")';
  }
  if (/^(get|find|fetch|read|load|retrieve|select)/.test(name)) {
    return 'expect(result).toBeDefined()';
  }
  if (/^(create|build|make|new|construct|generate|produce)/.test(name)) {
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }
  if (/^(to|format|stringify|serialize|encode|decode|convert|transform|parse)/.test(name)) {
    return 'expect(result).toBeDefined()';
  }

  // 3. DNA operationSequence — if no 'return' op, function is side-effect only
  if (dnaOps.length > 0 && !dnaOps.includes('return') && !dnaOps.includes('property_access')) {
    return 'expect(() => result).not.toThrow()';
  }

  // 4. DNA flowType hints
  if (dnaFlow.includes('validate') || dnaFlow.includes('check')) {
    return 'expect(typeof result).toBe("boolean")';
  }
  if (dnaFlow.includes('transform') || dnaFlow.includes('convert')) {
    return 'expect(result).toBeDefined()';
  }

  // 5. dataFlow outputs fallback
  const hasReturn = outputs?.some(o => o.type === 'return');
  if (!hasReturn && outputs?.some(o => o.isSideEffect)) {
    return 'expect(() => result).not.toThrow()';
  }

  return 'expect(result).toBeDefined()';
}

/**
 * Infiere assertion para edge cases (null/undefined/empty input)
 * basada en si la función tiene guards o throws para ese parámetro
 */
function generateEdgeCaseAssertion(paramName, atom) {
  const throws = atom?.errorFlow?.throws || [];
  const throwsOnNull = throws.some(t => {
    const cond = (t.condition || '').toLowerCase();
    return cond.includes(paramName.toLowerCase()) || cond.includes('null') || cond.includes('!');
  });
  if (throwsOnNull) {
    return atom?.isAsync
      ? `await expect(${atom.name}(null)).rejects.toThrow()`
      : `expect(() => ${atom.name}(null)).toThrow()`;
  }
  // Guard returns: function likely returns null/undefined/false gracefully
  const name = (atom?.name || '').toLowerCase();
  // is*/has*/can* return raw booleans; validate*/check* may return {valid,errors} objects
  if (/^(is|has|can)/.test(name))             return 'expect(result).toBe(false)';
  if (/^(validate|check)/.test(name))         return 'expect(result).toBeDefined()';
  if (/^(get|find|fetch|select)/.test(name))  return 'expect(result).toBeNull()';
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
