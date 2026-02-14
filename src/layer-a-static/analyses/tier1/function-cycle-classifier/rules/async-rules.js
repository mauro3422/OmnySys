/**
 * @fileoverview Async Pattern Rules
 * 
 * @module function-cycle-classifier/rules/async-rules
 */

/**
 * Event handler cycle rule
 */
export const eventHandlerCycleRule = {
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
};

/**
 * Async promise chain rule
 */
export const asyncPromiseChainRule = {
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
};

/**
 * Async cycle without error handling
 */
export const asyncCycleNoErrorHandlingRule = {
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
};
