/**
 * @fileoverview rules.js
 * 
 * Function cycle classification rules
 * 
 * @module function-cycle-classifier/classifiers/rules
 */

/**
 * Reglas usando SOLO metadatos confirmados que existen
 */
export const FUNCTION_CYCLE_RULES = [
  {
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
  },
  
  {
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
  },
  
  {
    id: 'event-handler-cycle',
    name: 'Event Handler Cycle',
    condition: (cycle, metadata) => {
      return cycle.every(funcId => {
        const func = metadata[funcId];
        if (!func) return false;
        
        const hasEventSetup = func.temporal?.eventSetup?.length > 0;
        const emitsEvents = func.calls?.some(c => 
          c.name?.includes('emit') || c.name?.includes('trigger')
        );
        const hasLifecycle = func.hasLifecycleHooks;
        
        return hasEventSetup || emitsEvents || hasLifecycle;
      });
    },
    severity: 'INFO',
    category: 'VALID_PATTERN',
    explanation: 'Ciclo de event handlers: flujo de eventos intencional',
    autoIgnore: true
  },
  
  {
    id: 'async-promise-chain',
    name: 'Async Promise Chain',
    condition: (cycle, metadata) => {
      return cycle.every(funcId => {
        const func = metadata[funcId];
        if (!func) return false;
        
        const isAsync = func.isAsync || func.temporal?.asyncPatterns?.isAsync;
        const hasPromiseChain = func.temporal?.asyncPatterns?.hasPromiseChain;
        
        return isAsync && hasPromiseChain;
      });
    },
    severity: 'INFO',
    category: 'VALID_PATTERN',
    explanation: 'Cadena de promesas async: patrón de flujo de control válido',
    autoIgnore: true
  },
  
  {
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
  },
  
  {
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
  },
  
  {
    id: 'async-cycle-no-error-handling',
    name: 'Async Cycle without Error Handling',
    condition: (cycle, metadata) => {
      const allAsync = cycle.every(funcId => {
        const func = metadata[funcId];
        return func?.isAsync || func?.temporal?.asyncPatterns?.hasAwait;
      });
      
      const noErrorHandling = cycle.every(funcId => {
        const func = metadata[funcId];
        return !func?.hasErrorHandling;
      });
      
      return allAsync && noErrorHandling && cycle.length >= 3;
    },
    severity: 'ERROR',
    category: 'CRITICAL_ISSUE',
    explanation: 'Ciclo async sin manejo de errores: riesgo de deadlock',
    autoIgnore: false,
    suggestion: 'Agregar try/catch, timeout, o circuit breaker'
  },
  
  {
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
  }
];
