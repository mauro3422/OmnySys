/**
 * @fileoverview Impact Query - Consulta de impacto de cambios
 * 
 * Responsabilidad Única (SRP): Calcular el impacto de cambiar una función.
 * 
 * @module module-system/queries
 */

/**
 * Resultado de análisis de impacto
 * @typedef {Object} ImpactResult
 * @property {string} function - Nombre de la función
 * @property {Object} local - Impacto local
 * @property {Object} global - Impacto global
 */

/**
 * Query: Impacto de cambiar una función
 * 
 * @param {string} functionName - Nombre de la función a analizar
 * @param {Object} moduleData - Datos del módulo y sistema
 * @param {Array} moduleData.modules - Módulos analizados
 * @param {Object} moduleData.system - Datos del sistema
 * @returns {ImpactResult} Análisis de impacto
 */
export function queryImpact(functionName, moduleData) {
  const { modules, system } = moduleData;
  
  const impact = {
    function: functionName,
    local: {
      module: null,
      files: [],
      chains: []
    },
    global: {
      businessFlows: [],
      entryPoints: [],
      modules: []
    }
  };
  
  // Buscar en módulos
  for (const module of modules) {
    // Buscar función
    const foundInChains = module.internalChains?.filter(chain =>
      chain.steps.some(s => s.function === functionName)
    ) || [];
    
    if (foundInChains.length > 0) {
      impact.local.module = module.moduleName;
      impact.local.chains = foundInChains.map(c => c.id);
      
      // Archivos afectados
      impact.local.files = [...new Set(foundInChains.flatMap(c =>
        c.steps.map(s => s.file)
      ))];
    }
  }
  
  // Buscar en business flows
  for (const flow of system.businessFlows) {
    const usesFunction = flow.steps.some(s => s.function === functionName);
    if (usesFunction) {
      impact.global.businessFlows.push({
        name: flow.name,
        step: flow.steps.find(s => s.function === functionName)?.order
      });
    }
  }
  
  return impact;
}

/**
 * Calcula el nivel de riesgo del impacto
 * @param {ImpactResult} impact - Resultado del análisis
 * @returns {string} Nivel de riesgo (low, medium, high, critical)
 */
export function calculateImpactRisk(impact) {
  const localComplexity = impact.local.chains.length + impact.local.files.length;
  const globalComplexity = impact.global.businessFlows.length;
  
  if (globalComplexity > 3 || localComplexity > 10) {
    return 'critical';
  }
  if (globalComplexity > 1 || localComplexity > 5) {
    return 'high';
  }
  if (localComplexity > 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * Genera resumen legible del impacto
 * @param {ImpactResult} impact - Resultado del análisis
 * @returns {string} Resumen legible
 */
export function summarizeImpact(impact) {
  const parts = [];
  
  if (impact.local.module) {
    parts.push(`Módulo: ${impact.local.module}`);
    parts.push(`Archivos afectados: ${impact.local.files.length}`);
    parts.push(`Chains involucradas: ${impact.local.chains.length}`);
  }
  
  if (impact.global.businessFlows.length > 0) {
    parts.push(`Business flows afectados: ${impact.global.businessFlows.length}`);
  }
  
  return parts.join(' | ');
}
