/**
 * @fileoverview Business Flow Analyzer
 * 
 * Detecta y trackea flujos de negocio desde entry points
 * 
 * @module module-system/analyzers/business-flow-analyzer
 * @phase 3
 */

import { classifySideEffects, aggregateSideEffects, inferModuleFromCall } from '../utils.js';

/**
 * Detecta flujos de negocio desde entry points
 * @param {Array} entryPoints - Entry points encontrados
 * @param {Object} context - Contexto con módulos y utilidades
 * @returns {Array} - Flujos de negocio detectados
 */
export function detectBusinessFlows(entryPoints, context) {
  const flows = [];
  
  for (const entry of entryPoints) {
    // Solo analizar API routes principales
    if (entry.type !== 'api') continue;
    
    const flow = traceBusinessFlow(entry, context);
    if (flow.steps.length > 1) {
      flows.push(flow);
    }
  }
  
  return flows;
}

/**
 * Trackea flujo de negocio desde un entry point
 * @param {Object} entry - Entry point
 * @param {Object} context - Contexto
 * @returns {Object} - Flujo trackeado
 */
function traceBusinessFlow(entry, context) {
  const { modules, moduleByName, findAtom } = context;
  const steps = [];
  const visited = new Set();
  const queue = [{
    module: entry.handler.module,
    function: entry.handler.function,
    order: 1,
    input: ['request']
  }];
  
  while (queue.length > 0 && steps.length < 20) {
    const current = queue.shift();
    
    if (visited.has(`${current.module}.${current.function}`)) continue;
    visited.add(`${current.module}.${current.function}`);
    
    // Buscar átomo
    const atom = findAtom(current.module, current.function);
    
    if (atom) {
      const step = {
        order: current.order,
        module: current.module,
        file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
        function: current.function,
        input: current.input,
        output: atom.dataFlow?.outputs?.map(o =>
          o.type === 'return' ? 'return' : o.target
        ) || [],
        async: atom.isAsync || false,
        sideEffects: classifySideEffects(atom),
        next: []
      };
      
      steps.push(step);
      
      // Agregar calls a la cola
      for (const call of atom.calls || []) {
        if (call.type === 'external') {
          const targetModule = inferModuleFromCall(call.name);
          if (targetModule && moduleByName.has(targetModule)) {
            queue.push({
              module: targetModule,
              function: call.name,
              order: current.order + 1,
              input: call.args?.map(a => a.name || 'arg') || []
            });
          }
        }
      }
    }
  }
  
  return {
    name: inferFlowName(entry),
    type: entry.type,
    entryPoint: entry,
    steps,
    totalSteps: steps.length,
    modulesInvolved: [...new Set(steps.map(s => s.module))],
    hasAsync: steps.some(s => s.async),
    sideEffects: aggregateSideEffects(steps)
  };
}



/**
 * Infiere nombre del flujo
 * @param {Object} entry - Entry point
 * @returns {string} - Nombre inferido
 */
function inferFlowName(entry) {
  if (entry.type === 'api') {
    return `${entry.method.toLowerCase()}_${entry.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  return entry.handler.function;
}

// Import path para uso interno
import path from 'path';
