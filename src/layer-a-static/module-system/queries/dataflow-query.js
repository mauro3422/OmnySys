/**
 * @fileoverview DataFlow Query - Consulta de flujo de datos
 * 
 * Responsabilidad Única (SRP): Consultar flujos de datos del sistema.
 * 
 * @module module-system/queries
 */

/**
 * Paso del flujo de datos
 * @typedef {Object} FlowStep
 * @property {number} order - Orden en el flujo
 * @property {string} location - Ubicación (módulo/archivo)
 * @property {string} function - Nombre de la función
 * @property {Array} input - Parámetros de entrada
 * @property {Array} output - Valores de retorno
 * @property {boolean} async - Si es asíncrona
 * @property {Array} sideEffects - Efectos secundarios
 */

/**
 * Resultado del flujo de datos
 * @typedef {Object} DataFlowResult
 * @property {string} name - Nombre del flujo
 * @property {Object} entry - Punto de entrada
 * @property {Array<FlowStep>} steps - Pasos del flujo
 * @property {Array} sideEffects - Efectos secundarios globales
 * @property {Array} modulesInvolved - Módulos involucrados
 */

/**
 * Query: Flujo completo de datos
 * 
 * @param {string} entryPoint - Nombre del entry point o flujo
 * @param {Object} moduleData - Datos del módulo y sistema
 * @param {Object} moduleData.system - Datos del sistema
 * @returns {DataFlowResult|null} Flujo de datos o null si no se encuentra
 */
export function queryDataFlow(entryPoint, moduleData) {
  const { system } = moduleData;
  
  const flow = system.businessFlows.find(f =>
    f.entryPoint.handler?.function === entryPoint ||
    f.name === entryPoint
  );
  
  if (!flow) {
    return null;
  }
  
  return {
    name: flow.name,
    entry: flow.entryPoint,
    steps: flow.steps.map(s => ({
      order: s.order,
      location: `${s.module}/${s.file}`,
      function: s.function,
      input: s.input,
      output: s.output,
      async: s.async,
      sideEffects: s.sideEffects
    })),
    sideEffects: flow.sideEffects,
    modulesInvolved: flow.modulesInvolved
  };
}

/**
 * Lista todos los flujos de datos disponibles
 * @param {Object} moduleData - Datos del sistema
 * @returns {Array<{name: string, type: string, steps: number}>} Lista de flujos
 */
export function listDataFlows(moduleData) {
  const { system } = moduleData;
  
  return system.businessFlows.map(flow => ({
    name: flow.name,
    type: flow.type,
    steps: flow.steps.length,
    modulesInvolved: flow.modulesInvolved?.length || 0,
    hasSideEffects: (flow.sideEffects?.length || 0) > 0
  }));
}

/**
 * Busca flujos que involucran un módulo específico
 * @param {string} moduleName - Nombre del módulo
 * @param {Object} moduleData - Datos del sistema
 * @returns {Array} Flujos que usan el módulo
 */
export function findFlowsByModule(moduleName, moduleData) {
  const { system } = moduleData;
  
  return system.businessFlows.filter(flow =>
    flow.modulesInvolved?.includes(moduleName) ||
    flow.steps.some(s => s.module === moduleName)
  );
}

/**
 * Busca flujos que contienen una función específica
 * @param {string} functionName - Nombre de la función
 * @param {Object} moduleData - Datos del sistema
 * @returns {Array} Flujos que contienen la función
 */
export function findFlowsByFunction(functionName, moduleData) {
  const { system } = moduleData;
  
  return system.businessFlows.filter(flow =>
    flow.steps.some(s => s.function === functionName)
  );
}
