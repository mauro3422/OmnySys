/**
 * Function Cycle Classifier - Usando METADATOS REALES del sistema
 * 
 * NO supone campos inexistentes. Usa SOLO lo que existe en átomos.
 * 
 * Campos disponibles confirmados:
 * - hasSideEffects, hasNetworkCalls, isAsync
 * - complexity, hasErrorHandling
 * - temporal.patterns (initialization, lifecycleHooks, timers, eventSetup)
 * - temporal.asyncPatterns (hasAwait, hasPromiseChain)
 * - calls (para detectar recursión)
 * 
 * @module function-cycle-classifier
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:function-cycle');

/**
 * Reglas usando SOLO metadatos confirmados que existen
 */
const FUNCTION_CYCLE_RULES = [
  {
    id: 'direct-recursion',
    name: 'Direct Recursion',
    condition: (cycle, metadata) => {
      // Función A → A (se llama a sí misma)
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
      // A → B → A, ambas puras (sin side effects)
      if (cycle.length !== 3) return false;
      
      const funcA = metadata[cycle[0]];
      const funcB = metadata[cycle[1]];
      
      if (!funcA || !funcB) return false;
      
      // Ambas deben ser puras
      const isPureA = !funcA.hasSideEffects && !funcA.hasNetworkCalls;
      const isPureB = !funcB.hasSideEffects && !funcB.hasNetworkCalls;
      
      // Baja complejidad indica algoritmo, no lógica de negocio
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
      // Todas las funciones tienen eventSetup o emiten eventos
      return cycle.every(funcId => {
        const func = metadata[funcId];
        if (!func) return false;
        
        // Tiene setup de eventos o llama a event emitters
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
      // Todas son async y usan Promise chain
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
      // Ciclo corto con funciones de inicialización
      if (cycle.length > 4) return false;
      
      return cycle.some(funcId => {
        const func = metadata[funcId];
        if (!func) return false;
        
        // Es función de inicialización
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
      
      // Al menos una función tiene side effects
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
      // Todas son async, ninguna tiene error handling
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
      
      // Muchas funciones con alta complejidad
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

/**
 * Extrae metadatos SOLO de campos confirmados que existen
 */
function extractFunctionMetadata(atom) {
  return {
    name: atom.name,
    complexity: atom.complexity || 0,
    hasSideEffects: atom.hasSideEffects || false,
    hasNetworkCalls: atom.hasNetworkCalls || false,
    hasStorageAccess: atom.hasStorageAccess || false,
    hasErrorHandling: atom.hasErrorHandling || false,
    isAsync: atom.isAsync || false,
    hasLifecycleHooks: atom.hasLifecycleHooks || false,
    temporal: atom.temporal || {},
    calls: atom.calls || []
  };
}

/**
 * Clasifica un ciclo de funciones
 */
export function classifyFunctionCycle(cycle, atomsIndex) {
  try {
    // Extraer metadatos para todas las funciones del ciclo
    const metadata = {};
    for (const funcId of cycle) {
      const parts = funcId.split('::');
      if (parts.length !== 2) continue;
      
      const [filePath, funcName] = parts;
      const fileData = atomsIndex[filePath];
      
      if (fileData?.atoms) {
        const atom = fileData.atoms.find(a => a.name === funcName);
        if (atom) {
          metadata[funcId] = extractFunctionMetadata(atom);
        }
      }
    }
    
    // Evaluar reglas
    const matches = FUNCTION_CYCLE_RULES
      .filter(rule => {
        try {
          return rule.condition(cycle, metadata);
        } catch (error) {
          logger.debug(`Error en regla ${rule.id}:`, error.message);
          return false;
        }
      })
      .sort((a, b) => {
        const order = { ERROR: 0, WARNING: 1, INFO: 2 };
        return order[a.severity] - order[b.severity];
      });
    
    if (matches.length === 0) {
      return {
        cycle,
        severity: 'WARNING',
        category: 'UNKNOWN',
        explanation: 'Ciclo de funciones sin patrón reconocido',
        autoIgnore: false,
        metadata
      };
    }
    
    const primary = matches[0];
    return {
      cycle,
      severity: primary.severity,
      category: primary.category,
      explanation: primary.explanation,
      autoIgnore: primary.autoIgnore,
      suggestion: primary.suggestion,
      ruleId: primary.id,
      metadata,
      allMatches: matches
    };
  } catch (error) {
    logger.error('Error clasificando ciclo de funciones:', error);
    return {
      cycle,
      severity: 'WARNING',
      category: 'ERROR',
      explanation: 'Error en clasificación',
      autoIgnore: false
    };
  }
}

/**
 * Clasifica todos los ciclos de funciones
 */
export function classifyAllFunctionCycles(cycles, atomsIndex) {
  if (!cycles || cycles.length === 0) {
    return {
      total: 0,
      valid: 0,
      problematic: 0,
      classifications: []
    };
  }
  
  const classifications = cycles.map(cycle => 
    classifyFunctionCycle(cycle, atomsIndex)
  );
  
  const validCount = classifications.filter(c => 
    c.category === 'VALID_PATTERN' || c.autoIgnore
  ).length;
  
  const problematicCount = classifications.filter(c =>
    c.category === 'CRITICAL_ISSUE' || c.category === 'REQUIRES_REVIEW'
  ).length;
  
  return {
    total: cycles.length,
    valid: validCount,
    problematic: problematicCount,
    classifications,
    // Ciclos que deben ignorarse
    ignoredCycles: classifications
      .filter(c => c.autoIgnore)
      .map(c => c.cycle),
    // Ciclos que deben reportarse
    reportedCycles: classifications
      .filter(c => !c.autoIgnore)
      .map(c => c.cycle)
  };
}

export { FUNCTION_CYCLE_RULES };
export default { classifyFunctionCycle, classifyAllFunctionCycles };
