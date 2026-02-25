/**
 * Test utilities
 * @module mcp/tools/generate-tests/test-analyzer/test-utils
 */

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

  if (internalCalls.length > 0 && atom.archetype?.type === 'orchestrator') {
    setup.push(`// Mock internal calls: ${internalCalls.map(c => c.name).slice(0, 5).join(', ')}`);
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
export function generateAssertion(outputs, functionName, typeContracts, atom) {
  const returns = typeContracts?.returns;
  const dnaFlow = atom?.dna?.flowType || '';
  const dnaOps = atom?.dna?.operationSequence || [];
  const outputsList = atom?.dataFlow?.outputs || [];
  const name = (functionName || '').toLowerCase();

  // PRIORIDAD 1: Usar los outputs del dataFlow
  if (outputsList.length > 0) {
    const boolOutputs = outputsList.filter(o => o.value === 'true' || o.value === 'false');
    if (boolOutputs.length > 0) {
      return TYPE_CONTRACT_ASSERTIONS.boolean;
    }

    const returnOutputs = outputsList.filter(o => o.type === 'return' && o.value);
    if (returnOutputs.length > 0) {
      const hasNull = returnOutputs.some(o => o.value === 'null' || o.value === '<null()>');
      if (hasNull) return 'expect(result).toBeDefined()';
    }
  }

  // PRIORIDAD 2: typeContracts
  if (returns?.type && TYPE_CONTRACT_ASSERTIONS[returns.type]) {
    const assertionFn = TYPE_CONTRACT_ASSERTIONS[returns.type];
    return typeof assertionFn === 'function' ? assertionFn(outputs) : assertionFn;
  }

  // PRIORIDAD 3: Inferir por nombre de función
  for (const { pattern, assertion } of NAME_PATTERN_ASSERTIONS) {
    if (pattern.test(name)) {
      return assertion;
    }
  }

  // PRIORIDAD 4: DNA flow
  if (dnaOps.length > 0 && !dnaOps.includes('return') && !dnaOps.includes('property_access')) {
    return 'expect(() => result).not.toThrow()';
  }

  for (const { pattern, assertion } of DNA_FLOW_ASSERTIONS) {
    if (dnaFlow.includes(pattern)) {
      return assertion;
    }
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
  if (/^(is|has|can)/.test(name))             return 'expect(result).toBe(false)';
  if (/^(validate|check)/.test(name))         return 'expect(result).toBeDefined()';
  if (/^(get|find|fetch|select)/.test(name))  return 'expect(result).toBeNull()';
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
