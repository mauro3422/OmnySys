/**
 * @fileoverview Complexity Rules
 * 
 * @module function-cycle-classifier/rules/complexity-rules
 */

/**
 * Initialization coordination rule
 */
export const initializationCoordinationRule = {
  id: 'initialization-coordination',
  name: 'Initialization Coordination',
  condition: (cycle, metadata) => {
    if (cycle.length > 4) return false;
    
    return cycle.some(funcId => {
      const func = metadata[funcId];
      if (!func) return false;
      
      const isInitFunction = func.temporal?.patterns?.initialization?.length > 0 ||
                            func.name?.toLowerCase().includes('init') ||
                            func.name?.toLowerCase().includes('setup');
      
      return isInitFunction;
    });
  },
  severity: 'INFO',
  category: 'VALID_PATTERN',
  explanation: 'Coordinación de inicialización: setup de componentes',
  autoIgnore: true
};

/**
 * High complexity deep cycle rule
 */
export const highComplexityDeepCycleRule = {
  id: 'high-complexity-deep-cycle',
  name: 'High Complexity Deep Cycle',
  condition: (cycle, metadata) => {
    if (cycle.length <= 3) return false;
    
    const highComplexityCount = cycle.filter(funcId => {
      const func = metadata[funcId];
      return (func?.complexity || 0) > 10;
    }).length;
    
    return highComplexityCount >= 2;
  },
  severity: 'ERROR',
  category: 'CRITICAL_ISSUE',
  explanation: 'Ciclo profundo con funciones complejas: difícil de mantener',
  autoIgnore: false,
  suggestion: 'Refactorizar usando State Machine o Strategy pattern'
};
