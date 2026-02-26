/**
 * Test utilities
 * @module mcp/tools/generate-tests/test-analyzer/test-utils
 */

import { getAtomSemantics, buildAssertionFromSemantics } from '../atom-semantic-analyzer/index.js';

/**
 * Reglas de aserción por tipo de retorno
 */
const TYPE_CONTRACT_ASSERTIONS = {
  boolean: 'expect(typeof result).toBe("boolean")',
  string: 'expect(typeof result).toBe("string")',
  number: 'expect(typeof result).toBe("number")',
  array: 'expect(Array.isArray(result)).toBe(true)',
  object: (outputs) => {
    const knownFields = outputs?.filter(o => !o.isSideEffect && o.type === 'return' && o.name) || [];
    if (knownFields.length > 0) {
      const fields = knownFields.slice(0, 3).map(o => `${o.name}: expect.anything()`).join(', ');
      return `expect(result).toEqual(expect.objectContaining({ ${fields} }))`;
    }
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }
};

/**
 * Patrones de nombres de funciones y sus aserciones
 */
const NAME_PATTERN_ASSERTIONS = [
  { pattern: /^(is|has|can|should|check|validate|verify)/, assertion: 'expect(typeof result).toBe("boolean")' },
  { pattern: /^(count|size|length|total|num)/, assertion: 'expect(typeof result).toBe("number")' },
  { pattern: /^(get|find|fetch|read|load|retrieve|select)/, assertion: 'expect(result).toBeDefined()' },
  { pattern: /^(create|build|make|new|construct|generate|produce)/, assertion: 'expect(result).toEqual(expect.objectContaining({}))' },
  { pattern: /^(to|format|stringify|serialize|encode|decode|convert|transform|parse)/, assertion: 'expect(result).toBeDefined()' }
];

/**
 * DNA flow patterns y sus aserciones
 */
const DNA_FLOW_ASSERTIONS = [
  { pattern: 'validate', assertion: 'expect(typeof result).toBe("boolean")' },
  { pattern: 'check', assertion: 'expect(typeof result).toBe("boolean")' },
  { pattern: 'transform', assertion: 'expect(result).toBeDefined()' },
  { pattern: 'convert', assertion: 'expect(result).toBeDefined()' }
];

/**
 * Genera setup code basado en la funcion
 * @param {Object} atom - Atom metadata
 * @returns {Array} - Setup code lines
 */
export function generateSetup(atom) {
  const setup = [];
  const calls = atom.callGraph?.callsList || [];
  const internalCalls = calls.filter(c => c.type === 'internal' || c.type === 'external');

  if (internalCalls.length > 0) {
    const atomImports = atom.imports || [];
    const mockedPaths = new Set();

    for (const call of internalCalls) {
      // Ignorar llamadas nativas comunes que no requieren mocks de archivo
      if (['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Promise', 'logger'].some(p => call.name.startsWith(p))) {
        continue;
      }

      let isMocked = false;
      const baseName = call.name.split('.')[0];

      // Buscar si la funcion llamada viene de un import
      for (const imp of atomImports) {
        const hasSpecifier = imp.specifiers?.some(s => s.name === baseName || s.local === baseName);

        // Si hay una coincidencia de specifier O el source path sugiere fuertemente que contiene la dependencia
        if (hasSpecifier || (imp.source && imp.source.includes(baseName.toLowerCase()))) {
          if (!mockedPaths.has(imp.source)) {
            // Limpiar artifacts de resolucion si existen
            let mockPath = imp.source.replace(/\/\.\//g, '/').replace(/^\.\//, './');

            // Convertir src/ a #/ (alias map de vitest/package.json) si se requiere
            if (mockPath.startsWith('src/')) {
              const domain = mockPath.split('/')[1];
              if (['ai', 'core', 'config'].includes(domain) || mockPath.includes('layer-')) {
                mockPath = mockPath.replace('src/layer-c-memory/', '#layer-c/')
                  .replace('src/layer-a-static/', '#layer-a/')
                  .replace('src/layer-b-semantic/', '#layer-b/')
                  .replace(/^src\/([^\/]+)\//, '#$1/');
              } else {
                mockPath = `../../${mockPath}`;
              }
            }

            setup.push(`vi.mock('${mockPath}'); // Auto-mocked dependency for ${call.name}`);
            mockedPaths.add(imp.source);
          }
          isMocked = true;
          break;
        }
      }

      // Fallback si no encontramos el import exacto pero es external y de negocio
      if (!isMocked && call.type === 'external' && !call.name.includes('.') && call.name.length > 3) {
        setup.push(`// TODO: vi.mock('.../${call.name}.js'); // Unresolved dependency`);
      }
    }

    // Si no logramos mockear nada pero había llamadas, dejamos el comentario legacy para orchestrators
    if (setup.length === 0 && atom.archetype?.type === 'orchestrator') {
      setup.push(`// Mock internal calls: ${internalCalls.map(c => c.name).slice(0, 5).join(', ')}`);
    }
  }

  return setup;
}

/**
 * Genera asercion basada en outputs, typeContracts, dataFlow, DNA y nombre de función
 * @param {Array} outputs - Function outputs
 * @param {string} functionName - Function name
 * @param {Object} typeContracts - Type contracts
 * @param {Object} atom - Atom metadata
 * @returns {string} - Assertion code
 */
export function generateAssertion(outputs, functionName, typeContracts, atom, testType = 'happy') {
  // ── PRIORIDAD 0: Semantic analyzer (new standardized layer) ──────────────
  if (atom) {
    const semantics = getAtomSemantics(atom);

    // Void function: always use side-effect assertion, never `result`.toBeDefined()
    if (!semantics.hasReturnValue) {
      if (semantics.mutatedParams.length > 0) {
        // Return a special marker that code-generator.js will expand into spy assertions
        return `/* VOID_MUTATION:${semantics.mutatedParams.join(',')} */`;
      }
      return `expect(() => { ${atom.name}; }).not.toThrow()`;
    }

    // Has real return literals → use them
    const assertion = buildAssertionFromSemantics(semantics, atom, testType);
    // Only use the semantic assertion if it's more specific than the generic fallback
    if (assertion && !assertion.includes('toBeDefined()') && !assertion.includes('VOID_MUTATION')) {
      return assertion;
    }
  }

  // ── Legacy chain (unchanged, for backward compat) ────────────────────────
  const returns = typeContracts?.returns;
  const dnaFlow = atom?.dna?.flowType || '';
  const dnaOps = atom?.dna?.operationSequence || [];
  const outputsList = atom?.dataFlow?.outputs || [];
  const name = (functionName || '').toLowerCase();

  if (outputsList.length > 0) {
    const boolOutputs = outputsList.filter(o => o.value === 'true' || o.value === 'false');
    if (boolOutputs.length > 0) return TYPE_CONTRACT_ASSERTIONS.boolean;

    const returnOutputs = outputsList.filter(o => o.type === 'return' && o.value);
    if (returnOutputs.length > 0) {
      const hasNull = returnOutputs.some(o => o.value === 'null' || o.value === '<null()>');
      if (hasNull) return 'expect(result).toBeDefined()';
    }
  }

  if (returns?.type && TYPE_CONTRACT_ASSERTIONS[returns.type]) {
    const assertionFn = TYPE_CONTRACT_ASSERTIONS[returns.type];
    return typeof assertionFn === 'function' ? assertionFn(outputs) : assertionFn;
  }

  for (const { pattern, assertion } of NAME_PATTERN_ASSERTIONS) {
    if (pattern.test(name)) return assertion;
  }

  if (dnaOps.length > 0 && !dnaOps.includes('return') && !dnaOps.includes('property_access')) {
    return 'expect(() => result).not.toThrow()';
  }

  for (const { pattern, assertion } of DNA_FLOW_ASSERTIONS) {
    if (dnaFlow.includes(pattern)) return assertion;
  }

  const hasReturn = outputs?.some(o => o.type === 'return');
  if (!hasReturn && outputs?.some(o => o.isSideEffect)) {
    return 'expect(() => result).not.toThrow()';
  }

  return 'expect(result).toBeDefined()';
}

/**
 * Infiere assertion para edge cases
 * @param {string} paramName - Parameter name
 * @param {Object} atom - Atom metadata
 * @returns {string} - Edge case assertion
 */
export function generateEdgeCaseAssertion(paramName, atom) {
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
  const name = (atom?.name || '').toLowerCase();
  if (/^(is|has|can)/.test(name)) return 'expect(result).toBe(false)';
  if (/^(validate|check)/.test(name)) return 'expect(result).toBeDefined()';
  if (/^(get|find|fetch|select)/.test(name)) return 'expect(result).toBeNull()';
  return 'expect(result).toBeDefined()';
}

/**
 * Verifica si tiene side effects
 * @param {Object} atom - Atom metadata
 * @returns {boolean} - True if atom has side effects
 */
export function hasSideEffects(atom) {
  return atom.hasSideEffects ||
    atom.sideEffects?.hasStorageAccess ||
    atom.sideEffects?.hasNetworkCalls;
}
