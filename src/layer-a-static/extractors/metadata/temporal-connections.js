/**
 * @fileoverview Temporal Connections Extractor
 * 
 * Extrae "cables temporales" - dependencias de orden de ejecución entre funciones.
 * 
 * Ejemplo: Si A tiene un useEffect de inicialización y B usa el resultado,
 * existe un cable temporal: A debe ejecutarse antes que B.
 * 
 * SSOT: Única fuente de detección de dependencias temporales.
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:extractors:temporal');

/**
 * Detecta patrones temporales en el código
 * 
 * @param {string} code - Código fuente de la función
 * @param {Object} functionInfo - Metadata de la función
 * @returns {Object} Conexiones temporales detectadas
 */
export function extractTemporalPatterns(code, functionInfo) {
  const patterns = {
    // Inicialización
    initialization: detectInitialization(code, functionInfo),
    
    // Lifecycle hooks (React/Vue/etc)
    lifecycleHooks: detectLifecycleHooks(code),
    
    // Timers
    timers: detectTimers(code),
    
    // Async/await patterns
    asyncPatterns: detectAsyncPatterns(code, functionInfo),
    
    // Event listeners (setup/cleanup)
    eventSetup: detectEventSetup(code),
    
    // Orden de ejecución implícito
    executionOrder: detectExecutionOrder(code, functionInfo)
  };

  return patterns;
}

/**
 * Detecta funciones de inicialización
 */
function detectInitialization(code, functionInfo) {
  const patterns = [];
  
  // Patrones de nombres de inicialización
  const initPatterns = [
    /^(init|setup|configure|prepare|bootstrap|start|create|initialize)[A-Z]/,
    /^(init|setup|configure|prepare|bootstrap|start|create|initialize)$/,
    /[Ii]nitialization/,
    /[Ss]etup/,
    /[Cc]onfiguration/
  ];
  
  const isInitByName = initPatterns.some(p => p.test(functionInfo.name));
  
  // Patrones de comportamiento
  const hasSingletonSetup = /(?:let|const|var)\s+\w+\s*=\s*(?:null|undefined)/.test(code) &&
                           /=\s*new\s+/.test(code);
  
  const hasConfigSetup = /(?:config|configuration|settings)\s*=/.test(code) &&
                        /(?:load|read|parse|default)/.test(code);
  
  const hasStateSetup = /(?:state|store|cache)\s*=/.test(code) &&
                       /(?:create|initialize|default)/.test(code);
  
  if (isInitByName || hasSingletonSetup || hasConfigSetup || hasStateSetup) {
    patterns.push({
      type: 'initialization',
      confidence: isInitByName ? 0.9 : 0.7,
      evidence: {
        nameMatch: isInitByName,
        singletonSetup: hasSingletonSetup,
        configSetup: hasConfigSetup,
        stateSetup: hasStateSetup
      }
    });
  }
  
  return patterns;
}

/**
 * Detecta lifecycle hooks de frameworks
 */
function detectLifecycleHooks(code) {
  const hooks = [];
  
  // React hooks
  const reactHooks = [
    { pattern: /useEffect\s*\(/, name: 'useEffect', phase: 'render' },
    { pattern: /useLayoutEffect\s*\(/, name: 'useLayoutEffect', phase: 'layout' },
    { pattern: /useMemo\s*\(/, name: 'useMemo', phase: 'render' },
    { pattern: /useCallback\s*\(/, name: 'useCallback', phase: 'render' },
    { pattern: /useInsertionEffect\s*\(/, name: 'useInsertionEffect', phase: 'insertion' },
    { pattern: /componentDidMount/, name: 'componentDidMount', phase: 'mount' },
    { pattern: /componentWillMount/, name: 'componentWillMount', phase: 'pre-mount' },
    { pattern: /componentWillUnmount/, name: 'componentWillUnmount', phase: 'unmount' }
  ];
  
  for (const hook of reactHooks) {
    if (hook.pattern.test(code)) {
      // Detectar dependencias
      const depsMatch = code.match(new RegExp(`${hook.name}\\s*\\([^)]*\\,\\s*(\\[[^\\]]*\\])`));
      const dependencies = depsMatch ? depsMatch[1] : 'unknown';
      
      hooks.push({
        type: hook.name,
        phase: hook.phase,
        dependencies,
        hasCleanup: /return\s*function|return\s*\(\)/.test(code.split(hook.name)[1]?.split('}')[0] || '')
      });
    }
  }
  
  return hooks;
}

/**
 * Detecta timers (setTimeout, setInterval)
 */
function detectTimers(code) {
  const timers = [];
  
  // setTimeout patterns
  const timeoutPattern = /setTimeout\s*\(\s*(?:function|=>|\w+)/g;
  const timeouts = code.match(timeoutPattern) || [];
  
  for (let i = 0; i < timeouts.length; i++) {
    const delayMatch = code.match(/setTimeout\s*\([^,]+,\s*(\d+)/);
    const delay = delayMatch ? parseInt(delayMatch[1]) : 'unknown';
    
    timers.push({
      type: 'setTimeout',
      delay,
      delayCategory: delay === 0 ? 'immediate' : 
                     delay <= 100 ? 'fast' : 
                     delay <= 1000 ? 'normal' : 'slow'
    });
  }
  
  // setInterval patterns
  const intervalPattern = /setInterval\s*\(/g;
  const intervals = code.match(intervalPattern) || [];
  
  for (let i = 0; i < intervals.length; i++) {
    timers.push({
      type: 'setInterval',
      recurring: true
    });
  }
  
  return timers;
}

/**
 * Detecta patrones async/await
 */
function detectAsyncPatterns(code, functionInfo) {
  const patterns = {
    isAsync: functionInfo.isAsync || /async\s+function/.test(code),
    hasAwait: /await\s+/.test(code),
    hasPromiseChain: /\.then\s*\(|\.catch\s*\(|\.finally\s*\(/.test(code),
    hasPromiseAll: /Promise\.all\s*\(/.test(code),
    hasPromiseRace: /Promise\.race\s*\(/.test(code),
    parallelOperations: detectParallelOperations(code),
    sequentialOperations: detectSequentialOperations(code)
  };
  
  return patterns;
}

/**
 * Detecta operaciones paralelas (potenciales race conditions)
 */
function detectParallelOperations(code) {
  const operations = [];
  
  // Promise.all indica paralelismo explícito
  const promiseAllPattern = /Promise\.all\s*\(\s*\[([^\]]+)\]/g;
  let match;
  
  while ((match = promiseAllPattern.exec(code)) !== null) {
    const calls = match[1].split(',').map(c => c.trim());
    operations.push({
      type: 'Promise.all',
      parallelCalls: calls.length,
      calls: calls.slice(0, 5) // primeros 5
    });
  }
  
  // Array de promesas seguido de await
  const arrayPromisePattern = /await\s+Promise\.all\s*\(/;
  if (arrayPromisePattern.test(code)) {
    operations.push({
      type: 'await-Promise.all',
      pattern: 'explicit-parallel'
    });
  }
  
  return operations;
}

/**
 * Detecta operaciones secuenciales
 */
function detectSequentialOperations(code) {
  const operations = [];
  
  // Múltiples awaits seguidos
  const awaits = code.match(/await\s+\w+/g) || [];
  if (awaits.length > 1) {
    operations.push({
      type: 'sequential-awaits',
      count: awaits.length,
      pattern: 'sequential-by-default'
    });
  }
  
  // Promise chain (then/catch/finally)
  const chains = code.match(/\.then\s*\([^)]*\)\s*\.\w+/g) || [];
  if (chains.length > 0) {
    operations.push({
      type: 'promise-chain',
      count: chains.length,
      pattern: 'sequential-chain'
    });
  }
  
  return operations;
}

/**
 * Detecta setup de event listeners
 */
function detectEventSetup(code) {
  const events = [];
  
  // addEventListener
  const listenerPattern = /addEventListener\s*\(\s*['"](\w+)['"]/g;
  let match;
  
  while ((match = listenerPattern.exec(code)) !== null) {
    events.push({
      type: 'addEventListener',
      event: match[1],
      hasCleanup: code.includes('removeEventListener')
    });
  }
  
  // EventEmitter.on
  const emitterPattern = /\.on\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = emitterPattern.exec(code)) !== null) {
    events.push({
      type: 'EventEmitter.on',
      event: match[1],
      hasCleanup: code.includes('.off(') || code.includes('.removeListener(')
    });
  }
  
  return events;
}

/**
 * Detecta orden de ejecución implícito
 */
function detectExecutionOrder(code, functionInfo) {
  const order = {
    mustRunBefore: [],
    mustRunAfter: [],
    canRunInParallel: []
  };
  
  // Si es inicialización, debe correr antes que lectores
  if (functionInfo.temporal?.initialization?.length > 0) {
    order.mustRunBefore.push({
      reason: 'initialization-provider',
      provides: ['config', 'state', 'singleton'],
      confidence: 0.8
    });
  }
  
  // Si usa variables que parecen inicializadas externamente
  const externalVarPattern = /(?:get|load|fetch)(?:Config|State|Data|Instance)/;
  if (externalVarPattern.test(code)) {
    order.mustRunAfter.push({
      reason: 'initialization-consumer',
      needs: ['initialization'],
      confidence: 0.7
    });
  }
  
  return order;
}

/**
 * Cross-reference temporal entre funciones de un archivo
 * 
 * @param {Array} atoms - Átomos del archivo
 * @returns {Array} Conexiones temporales detectadas
 */
export function extractTemporalConnections(atoms) {
  const connections = [];
  
  // Mapear inicializadores
  const initializers = atoms.filter(a => 
    a.temporal?.initialization?.length > 0
  );
  
  // Mapear consumidores
  const consumers = atoms.filter(a => 
    a.temporal?.executionOrder?.mustRunAfter?.some(
      r => r.reason === 'initialization-consumer'
    )
  );
  
  // Crear conexiones
  for (const init of initializers) {
    for (const consumer of consumers) {
      if (init.id !== consumer.id) {
        connections.push({
          type: 'temporal-dependency',
          from: init.id,
          to: consumer.id,
          relationship: 'must-run-before',
          reason: 'initialization',
          confidence: 0.75,
          evidence: {
            initializer: init.name,
            consumer: consumer.name,
            initPattern: init.temporal.initialization[0]?.type
          }
        });
      }
    }
  }
  
  // Detectar lifecycle conflicts
  const hooks = atoms.flatMap(a => 
    (a.temporal?.lifecycleHooks || []).map(h => ({
      atom: a,
      hook: h
    }))
  );
  
  // Funciones en mismo hook phase pueden tener race conditions
  const hooksByPhase = groupBy(hooks, h => h.hook.phase);
  
  for (const [phase, phaseHooks] of Object.entries(hooksByPhase)) {
    if (phaseHooks.length > 1) {
      // Múltiples funciones en mismo phase = potencial race
      for (let i = 0; i < phaseHooks.length; i++) {
        for (let j = i + 1; j < phaseHooks.length; j++) {
          connections.push({
            type: 'temporal-constraint',
            from: phaseHooks[i].atom.id,
            to: phaseHooks[j].atom.id,
            relationship: 'same-execution-phase',
            phase,
            potentialRace: true,
            confidence: 0.6
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Cross-reference temporal entre archivos
 * 
 * Detecta cuando archivo A debe inicializarse antes que archivo B
 * 
 * @param {Array} allAtoms - Todos los átomos del proyecto
 * @returns {Array} Conexiones temporales cross-file
 */
export function extractCrossFileTemporalConnections(allAtoms) {
  const connections = [];
  
  // Agrupar por archivo
  const atomsByFile = groupBy(allAtoms, a => a.filePath);
  
  // Identificar archivos inicializadores
  const initFiles = [];
  const consumerFiles = [];
  
  for (const [filePath, atoms] of Object.entries(atomsByFile)) {
    const hasInitializer = atoms.some(a => 
      a.temporal?.initialization?.length > 0
    );
    
    const hasConsumer = atoms.some(a =>
      a.temporal?.executionOrder?.mustRunAfter?.length > 0
    );
    
    if (hasInitializer) {
      initFiles.push({ filePath, atoms });
    }
    
    if (hasConsumer) {
      consumerFiles.push({ filePath, atoms });
    }
  }
  
  // Conectar inicializadores con consumidores que los importan
  for (const initFile of initFiles) {
    for (const consumerFile of consumerFiles) {
      // Verificar si consumer importa init
      const consumerImports = consumerFile.atoms[0]?.imports || [];
      const importsInit = consumerImports.some(imp => 
        imp.source.includes(initFile.filePath.replace('.js', ''))
      );
      
      if (importsInit) {
        connections.push({
          type: 'cross-file-temporal',
          from: initFile.filePath,
          to: consumerFile.filePath,
          relationship: 'must-initialize-before',
          confidence: 0.8,
          evidence: {
            import: true,
            initializers: initFile.atoms
              .filter(a => a.temporal?.initialization?.length > 0)
              .map(a => a.name),
            consumers: consumerFile.atoms
              .filter(a => a.temporal?.executionOrder?.mustRunAfter?.length > 0)
              .map(a => a.name)
          }
        });
      }
    }
  }
  
  return connections;
}

// Helper
function groupBy(array, keyFn) {
  const groups = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}


