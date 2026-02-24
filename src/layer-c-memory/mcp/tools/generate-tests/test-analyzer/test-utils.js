/**
 * Test utilities
 * @module mcp/tools/generate-tests/test-analyzer/test-utils
 */

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
  const dnaOps  = atom?.dna?.operationSequence || [];
  const outputsList = atom?.dataFlow?.outputs || [];
  
  // PRIORIDAD 1: Usar los outputs del dataFlow
  if (outputsList.length > 0) {
    // Si los outputs tienen valores específicos (true, false, etc), usarlos
    const boolOutputs = outputsList.filter(o => o.value === 'true' || o.value === 'false');
    if (boolOutputs.length > 0) {
      return 'expect(typeof result).toBe("boolean")';
    }
    
    // Si retorna valores específicos
    const returnOutputs = outputsList.filter(o => o.type === 'return' && o.value);
    if (returnOutputs.length > 0) {
      const hasNull = returnOutputs.some(o => o.value === 'null' || o.value === '<null()>');
      if (hasNull) return 'expect(result).toBeDefined()';
    }
  }
  
  // PRIORIDAD 2: typeContracts
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

  const name = (functionName || '').toLowerCase();
  
  // PRIORIDAD 3: Inferir por nombre de función
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

  // PRIORIDAD 4: DNA flow
  if (dnaOps.length > 0 && !dnaOps.includes('return') && !dnaOps.includes('property_access')) {
    return 'expect(() => result).not.toThrow()';
  }

  if (dnaFlow.includes('validate') || dnaFlow.includes('check')) {
    return 'expect(typeof result).toBe("boolean")';
  }
  if (dnaFlow.includes('transform') || dnaFlow.includes('convert')) {
    return 'expect(result).toBeDefined()';
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
