/**
 * @fileoverview Recursion Detection Rules
 * 
 * @module function-cycle-classifier/rules/recursion-rules
 */

/**
 * Direct recursion rule: A → A
 */
export const directRecursionRule = {
  id: 'direct-recursion',
  name: 'Direct Recursion',
  condition: (cycle, metadata) => {
    if (cycle.length !== 2) return false;
    return cycle[0] === cycle[1];
  },
  severity: 'INFO',
  category: 'VALID_PATTERN',
  explanation: 'Recursión directa: patrón algorítmico válido',
  autoIgnore: true
};

/**
 * Pure mutual recursion rule: A → B → A, both pure
 */
export const pureMutualRecursionRule = {
  id: 'pure-algorithm-mutual-recursion',
  name: 'Pure Algorithm Mutual Recursion',
  condition: (cycle, metadata) => {
    if (cycle.length !== 3) return false;
    
    const funcA = metadata[cycle[0]];
    const funcB = metadata[cycle[1]];
    
    if (!funcA || !funcB) return false;
    
    const isPureA = !funcA.hasSideEffects && !funcA.hasNetworkCalls;
    const isPureB = !funcB.hasSideEffects && !funcB.hasNetworkCalls;
    const isSimpleA = (funcA.complexity || 0) <= 5;
    const isSimpleB = (funcB.complexity || 0) <= 5;
    
    return isPureA && isPureB && isSimpleA && isSimpleB;
  },
  severity: 'INFO',
  category: 'VALID_PATTERN',
  explanation: 'Recursión mutua pura: algoritmos matemáticos válidos',
  autoIgnore: true
};

/**
 * Mutual recursion with side effects
 */
export const mutualRecursionWithSideEffectsRule = {
  id: 'mutual-recursion-with-side-effects',
  name: 'Mutual Recursion with Side Effects',
  condition: (cycle, metadata) => {
    if (cycle.length < 3) return false;
    
    const hasSideEffects = cycle.some(funcId => {
      const func = metadata[funcId];
      return func?.hasSideEffects || func?.hasStorageAccess;
    });
    
    const hasNetworkCalls = cycle.some(funcId => {
      const func = metadata[funcId];
      return func?.hasNetworkCalls;
    });
    
    return hasSideEffects || hasNetworkCalls;
  },
  severity: 'WARNING',
  category: 'REQUIRES_REVIEW',
  explanation: 'Recursión mutua con side effects: revisar terminación',
  autoIgnore: false,
  suggestion: 'Agregar límites de iteración o timeout'
};
